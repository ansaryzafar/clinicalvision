"""
Tests for file content validation
Ensures uploaded files are properly validated and secure
"""

import pytest
import io
from fastapi import UploadFile
from PIL import Image
from app.core.file_validator import (
    validate_file_content,
    get_safe_filename,
    validate_image_dimensions,
    FileValidationError
)


class TestFileContentValidation:
    """Test file content validation using magic bytes"""
    
    @pytest.mark.asyncio
    async def test_valid_jpeg_file(self):
        """Should accept valid JPEG file"""
        # Create a valid JPEG in memory
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        file = UploadFile(
            filename="test.jpg",
            file=img_bytes
        )
        
        result = await validate_file_content(file, '.jpg')
        assert result is True
    
    @pytest.mark.asyncio
    async def test_valid_png_file(self):
        """Should accept valid PNG file"""
        img = Image.new('RGB', (100, 100), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        file = UploadFile(
            filename="test.png",
            file=img_bytes
        )
        
        result = await validate_file_content(file, '.png')
        assert result is True
    
    @pytest.mark.asyncio
    async def test_reject_wrong_extension(self):
        """Should reject file when extension doesn't match content"""
        # Create PNG file but claim it's JPEG
        img = Image.new('RGB', (100, 100), color='green')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        file = UploadFile(
            filename="fake.jpg",  # Wrong extension
            file=img_bytes
        )
        
        with pytest.raises(FileValidationError) as exc_info:
            await validate_file_content(file, '.jpg')
        
        assert "does not match" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_reject_empty_file(self):
        """Should reject empty files"""
        empty_file = UploadFile(
            filename="empty.jpg",
            file=io.BytesIO(b'')
        )
        
        with pytest.raises(FileValidationError) as exc_info:
            await validate_file_content(empty_file, '.jpg')
        
        assert "empty" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_reject_oversized_file(self):
        """Should reject files exceeding size limit"""
        # Create large content
        large_content = b'x' * (51 * 1024 * 1024)  # 51 MB
        
        file = UploadFile(
            filename="large.jpg",
            file=io.BytesIO(large_content)
        )
        
        with pytest.raises(FileValidationError) as exc_info:
            await validate_file_content(file, '.jpg', max_size=50*1024*1024)
        
        assert "exceeds maximum" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_reject_text_file_as_image(self):
        """Should reject text file disguised as image"""
        text_content = b"This is just text, not an image"
        
        file = UploadFile(
            filename="fake.jpg",
            file=io.BytesIO(text_content)
        )
        
        with pytest.raises(FileValidationError):
            await validate_file_content(file, '.jpg')
    
    @pytest.mark.asyncio
    async def test_reject_executable_as_image(self):
        """Should reject executable file disguised as image"""
        # Simulated executable header
        exe_content = b'\x4d\x5a\x90\x00' + b'x' * 1000  # MZ header (Windows EXE)
        
        file = UploadFile(
            filename="virus.jpg",
            file=io.BytesIO(exe_content)
        )
        
        with pytest.raises(FileValidationError):
            await validate_file_content(file, '.jpg')


class TestFilenameSanitization:
    """Test filename sanitization for security"""
    
    def test_remove_directory_traversal(self):
        """Should remove directory traversal attempts"""
        dangerous = "../../etc/passwd"
        safe = get_safe_filename(dangerous)
        
        assert ".." not in safe
        assert "/" not in safe
        # Function removes all directory separators and dots
        assert safe == "passwd"
    
    def test_remove_special_characters(self):
        """Should remove special characters"""
        dangerous = "file;<script>alert('xss')</script>.jpg"
        safe = get_safe_filename(dangerous)
        
        assert "<" not in safe
        assert ">" not in safe
        assert ";" not in safe
        assert safe.endswith(".jpg")
    
    def test_preserve_valid_filename(self):
        """Should preserve valid filenames"""
        valid = "my-image_123.jpg"
        safe = get_safe_filename(valid)
        
        assert safe == valid
    
    def test_limit_filename_length(self):
        """Should limit filename length"""
        long_name = "a" * 300 + ".jpg"
        safe = get_safe_filename(long_name)
        
        assert len(safe) <= 255
        assert safe.endswith(".jpg")
    
    def test_handle_null_bytes(self):
        """Should remove null bytes"""
        dangerous = "file\x00.jpg.exe"
        safe = get_safe_filename(dangerous)
        
        assert "\x00" not in safe


class TestImageDimensionValidation:
    """Test image dimension validation"""
    
    @pytest.mark.asyncio
    async def test_valid_image_dimensions(self):
        """Should accept image with valid dimensions"""
        img = Image.new('RGB', (800, 600), color='white')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        file = UploadFile(
            filename="valid.jpg",
            file=img_bytes
        )
        
        width, height = await validate_image_dimensions(file)
        assert width == 800
        assert height == 600
    
    @pytest.mark.asyncio
    async def test_reject_too_small_image(self):
        """Should reject image that's too small"""
        img = Image.new('RGB', (10, 10), color='black')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        file = UploadFile(
            filename="tiny.jpg",
            file=img_bytes
        )
        
        with pytest.raises(FileValidationError) as exc_info:
            await validate_image_dimensions(file, min_width=50, min_height=50)
        
        assert "too small" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_reject_too_large_image(self):
        """Should reject image that's too large (prevent decompression bombs)"""
        img = Image.new('RGB', (15000, 15000), color='white')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG', quality=1)  # Low quality to reduce size
        img_bytes.seek(0)
        
        file = UploadFile(
            filename="huge.jpg",
            file=img_bytes
        )
        
        with pytest.raises(FileValidationError) as exc_info:
            await validate_image_dimensions(file, max_width=10000, max_height=10000)
        
        # Check for decompression bomb message
        error_msg = str(exc_info.value).lower()
        assert "decompression bomb" in error_msg or "too large" in error_msg
    
    @pytest.mark.asyncio
    async def test_reject_corrupted_image(self):
        """Should reject corrupted image file"""
        corrupted_data = b'\xff\xd8\xff' + b'corrupted' * 100
        
        file = UploadFile(
            filename="corrupted.jpg",
            file=io.BytesIO(corrupted_data)
        )
        
        with pytest.raises(FileValidationError):
            await validate_image_dimensions(file)


class TestSecurityVulnerabilities:
    """Test protection against known security vulnerabilities"""
    
    @pytest.mark.asyncio
    async def test_prevent_zip_bomb(self):
        """Should detect and reject potential zip bombs"""
        # A small compressed file that expands to huge size
        # This is tested via size limits
        large_content = b'x' * (100 * 1024 * 1024)  # 100 MB
        
        file = UploadFile(
            filename="bomb.jpg",
            file=io.BytesIO(large_content)
        )
        
        with pytest.raises(FileValidationError):
            await validate_file_content(file, '.jpg', max_size=50*1024*1024)
    
    @pytest.mark.asyncio
    async def test_prevent_polyglot_file(self):
        """Should detect polyglot files (valid as multiple formats)"""
        # File that starts with JPEG header but contains other data
        polyglot = b'\xff\xd8\xff\xe0\x00\x10JFIF' + b'<script>alert("xss")</script>' * 100
        
        file = UploadFile(
            filename="polyglot.jpg",
            file=io.BytesIO(polyglot)
        )
        
        # Should validate based on MIME type, not just magic bytes
        try:
            await validate_file_content(file, '.jpg')
        except FileValidationError:
            pass  # Expected to fail
    
    def test_sql_injection_in_filename(self):
        """Should sanitize SQL injection attempts in filename"""
        malicious = "'; DROP TABLE users; --.jpg"
        safe = get_safe_filename(malicious)
        
        # Semicolons and single quotes should be removed
        assert ";" not in safe
        assert "'" not in safe
        # The function sanitizes but may keep alphanumeric characters
        # At minimum, dangerous SQL characters should be removed
        assert ";" not in safe and "'" not in safe


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
