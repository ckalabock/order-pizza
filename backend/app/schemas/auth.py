from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2, max_length=120)


class LoginIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    login: str = Field(alias="email")
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
