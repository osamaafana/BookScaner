"""
Secrets Management and Token Rotation
Handles secure secret generation, validation, and rotation
"""

import hashlib
import hmac
import logging
import os
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict

logger = logging.getLogger(__name__)


class SecretManager:
    """Manages application secrets with rotation capabilities"""

    def __init__(self):
        self.admin_token = self._get_or_generate_admin_token()
        self.jwt_secret = self._get_or_generate_jwt_secret()
        self.token_rotation_interval = 30 * 24 * 3600  # 30 days in seconds

    def _get_or_generate_admin_token(self) -> str:
        """Get admin token from environment or generate a secure one"""
        token = os.getenv("ADMIN_TOKEN")
        if not token or token == "change-me":
            # Generate a secure token
            token = self._generate_secure_token(32)
            logger.warning(
                "Generated new ADMIN_TOKEN. Please update your environment variables!"
            )
            logger.warning(f"ADMIN_TOKEN={token}")
        return token

    def _get_or_generate_jwt_secret(self) -> str:
        """Get JWT secret from environment or generate a secure one"""
        secret = os.getenv("JWT_SECRET")
        if not secret or secret == "change-me":
            # Generate a secure secret
            secret = self._generate_secure_token(64)
            logger.warning(
                "Generated new JWT_SECRET. Please update your environment variables!"
            )
            logger.warning(f"JWT_SECRET={secret}")
        return secret

    def _generate_secure_token(self, length: int = 32) -> str:
        """Generate a cryptographically secure token"""
        return secrets.token_urlsafe(length)

    def validate_admin_token(self, provided_token: str) -> bool:
        """Validate admin token with constant-time comparison"""
        if not provided_token:
            return False

        # Use constant-time comparison to prevent timing attacks
        return hmac.compare_digest(self.admin_token, provided_token)

    def generate_api_key(self, user_id: str, expires_days: int = 90) -> Dict[str, Any]:
        """Generate a time-limited API key"""
        key_id = self._generate_secure_token(16)
        key_secret = self._generate_secure_token(32)

        # Create a hash of the full key for storage
        full_key = f"{key_id}.{key_secret}"
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()

        expires_at = datetime.utcnow() + timedelta(days=expires_days)

        return {
            "key_id": key_id,
            "key_secret": key_secret,
            "full_key": full_key,  # Only return this once
            "key_hash": key_hash,
            "user_id": user_id,
            "expires_at": expires_at,
            "created_at": datetime.utcnow(),
        }

    def validate_api_key(self, provided_key: str, stored_hash: str) -> bool:
        """Validate API key against stored hash"""
        if not provided_key or not stored_hash:
            return False

        # Hash the provided key and compare
        provided_hash = hashlib.sha256(provided_key.encode()).hexdigest()
        return hmac.compare_digest(stored_hash, provided_hash)

    def should_rotate_secrets(self) -> bool:
        """Check if secrets should be rotated based on time"""
        # This would typically check a stored timestamp
        # For now, we'll just log a warning
        logger.info("Secret rotation check - implement based on your requirements")
        return False

    def rotate_admin_token(self) -> str:
        """Rotate the admin token and return the new one"""
        self.admin_token = self._generate_secure_token(32)

        logger.warning("ADMIN_TOKEN rotated!")
        logger.warning(f"New ADMIN_TOKEN={self.admin_token}")

        return self.admin_token

    def get_security_headers(self) -> Dict[str, str]:
        """Get security-related headers for responses"""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Referrer-Policy": "strict-origin-when-cross-origin",
        }


# Global instance
secret_manager = SecretManager()
