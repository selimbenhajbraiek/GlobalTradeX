from pydantic import BaseModel, EmailStr, Field


class MessageResponse(BaseModel):
    message: str


class RegisterResponse(BaseModel):
    message: str
    email: str
    requires_verification: bool = True


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=8)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=10)
