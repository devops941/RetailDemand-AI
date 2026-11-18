from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)


def test_password_hash_round_trip():
    plain = "mysecretpassword"
    hashed = get_password_hash(plain)
    assert hashed != plain
    assert verify_password(plain, hashed)


def test_wrong_password_fails():
    hashed = get_password_hash("correct_password")
    assert not verify_password("wrong_password", hashed)


def test_create_access_token_is_string():
    token = create_access_token({"sub": "user123", "role": "analyst"})
    assert isinstance(token, str)
    assert len(token) > 20


def test_access_token_decode():
    token = create_access_token({"sub": "user123", "role": "admin"})
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "user123"
    assert payload["role"] == "admin"
    assert payload["type"] == "access"


def test_refresh_token_decode():
    token = create_refresh_token({"sub": "user456"})
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "user456"
    assert payload["type"] == "refresh"


def test_invalid_token_returns_none():
    result = decode_token("definitely.not.a.valid.jwt")
    assert result is None


def test_tampered_token_returns_none():
    token = create_access_token({"sub": "user1"})
    tampered = token[:-5] + "XXXXX"
    result = decode_token(tampered)
    assert result is None
