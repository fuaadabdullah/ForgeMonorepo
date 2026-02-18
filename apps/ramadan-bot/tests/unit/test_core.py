import datetime
from botocore.exceptions import ClientError


def test_get_today_ramadan_day_start(load_module, monkeypatch):
    mod = load_module()
    tz = mod.pytz.timezone(mod.TZ)

    class FakeDateTime(datetime.datetime):
        @classmethod
        def now(cls, tzinfo=None):
            return tz.localize(datetime.datetime(2026, 2, 17, 5, 0))

    monkeypatch.setattr(mod, "dt", FakeDateTime)
    assert mod.get_today_ramadan_day() == 1


def test_get_today_ramadan_day_outside(load_module, monkeypatch):
    mod = load_module()
    tz = mod.pytz.timezone(mod.TZ)

    class FakeDateTime(datetime.datetime):
        @classmethod
        def now(cls, tzinfo=None):
            return tz.localize(datetime.datetime(2026, 2, 10, 5, 0))

    monkeypatch.setattr(mod, "dt", FakeDateTime)
    assert mod.get_today_ramadan_day() == 0


def test_cache_path_for_juz(load_module):
    mod = load_module()
    assert mod.cache_path_for_juz(2).endswith("juz_2.png")
    assert mod.cache_path_for_juz(2, "2026-02-18").endswith("juz_2_2026-02-18.png")


def test_marker_local_roundtrip(load_module):
    mod = load_module()
    date_obj = datetime.date(2026, 2, 18)
    assert mod.already_sent_marker(date_obj, use_s3=False) is False
    assert mod.write_sent_marker(date_obj, use_s3=False) is True
    assert mod.already_sent_marker(date_obj, use_s3=False) is True


def test_siliconflow_generate_bytes_test_mode(load_module, monkeypatch):
    mod = load_module()
    monkeypatch.setattr(mod, "TEST_MODE", True)
    data = mod.siliconflow_generate_bytes("", "model", "prompt")
    assert data.startswith(b"\x89PNG")


def test_generate_and_cache_uses_cache(load_module, monkeypatch):
    mod = load_module()
    cached_path = mod.cache_path_for_juz(3, "2026-02-18")
    with open(cached_path, "wb") as f:
        f.write(b"cached")

    monkeypatch.setattr(
        mod,
        "siliconflow_generate_bytes",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("should not call")),
    )

    data, path = mod.generate_and_cache(3, force=False, date_tag="2026-02-18")
    assert data == b"cached"
    assert path == cached_path


def test_send_via_email_sms_sendgrid(load_module, monkeypatch, temp_image):
    mod = load_module()
    monkeypatch.setattr(mod, "TEST_MODE", False)
    monkeypatch.setattr(mod, "SENDGRID_API_KEY", "SG_test")

    sent = {}

    class DummySMTP:
        def __init__(self, host, port):
            self.host = host
            self.port = port
            sent["host"] = host
            sent["port"] = port

        def starttls(self):
            return None

        def login(self, user, password):
            sent["login"] = (user, password)

        def send_message(self, message):
            sent["to"] = message["To"]

        def quit(self):
            return None

    monkeypatch.setattr(mod.smtplib, "SMTP", DummySMTP)

    mod.send_via_email_sms(
        str(temp_image),
        "Subject",
        "Body",
        recipients=["123@tmomail.net"],
    )

    assert sent["host"] == mod.SENDGRID_SMTP_HOST
    assert sent["port"] == mod.SENDGRID_SMTP_PORT
    assert sent["login"] == (mod.SENDGRID_SMTP_USER, "SG_test")


def test_send_today_outside_ramadan(load_module, monkeypatch):
    mod = load_module()
    monkeypatch.setattr(mod, "get_today_ramadan_day", lambda: 0)
    res = mod.send_today()
    assert res["skipped"] is True
    assert res["reason"] == "outside_ramadan"


def test_ci_run_not_fajr(load_module, monkeypatch):
    mod = load_module()
    tz = mod.pytz.timezone(mod.TZ)
    fake_now = tz.localize(datetime.datetime(2026, 2, 18, 1, 0))

    class FakeDateTime(datetime.datetime):
        @classmethod
        def now(cls, tzinfo=None):
            return fake_now

    monkeypatch.setattr(mod, "dt", FakeDateTime)
    monkeypatch.setattr(
        mod,
        "compute_fajr_for",
        lambda *args, **kwargs: fake_now + datetime.timedelta(hours=2),
    )

    res = mod.ci_run(window_minutes=10, force=False)
    assert res["skipped"] is True
    assert res["reason"] == "not_fajr_time"


def test_compute_fajr_for_calls_dawn(load_module, monkeypatch):
    mod = load_module()
    tz = mod.pytz.timezone(mod.TZ)
    expected = tz.localize(datetime.datetime(2026, 2, 18, 5, 0))
    called = {}

    def fake_dawn(observer, date, tzinfo, depression):
        called["observer"] = observer
        called["date"] = date
        called["tzinfo"] = tzinfo
        called["depression"] = depression
        return expected

    monkeypatch.setattr(mod, "dawn", fake_dawn)

    res = mod.compute_fajr_for(datetime.date(2026, 2, 18))
    assert res == expected
    assert called["depression"] == 18.0


def test_s3_sent_marker_true(load_module, monkeypatch):
    mod = load_module()
    monkeypatch.setattr(mod, "S3_BUCKET", "bucket")
    monkeypatch.setattr(mod, "AWS_ACCESS_KEY_ID", "key")
    monkeypatch.setattr(mod, "AWS_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setattr(mod, "AWS_REGION", "us-east-1")

    class FakeS3:
        def head_object(self, Bucket, Key):
            return {"Bucket": Bucket, "Key": Key}

    monkeypatch.setattr(mod.boto3, "client", lambda *args, **kwargs: FakeS3())

    assert mod.already_sent_marker(datetime.date(2026, 2, 18), use_s3=True) is True


def test_s3_sent_marker_false(load_module, monkeypatch):
    mod = load_module()
    monkeypatch.setattr(mod, "S3_BUCKET", "bucket")
    monkeypatch.setattr(mod, "AWS_ACCESS_KEY_ID", "key")
    monkeypatch.setattr(mod, "AWS_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setattr(mod, "AWS_REGION", "us-east-1")

    class FakeS3:
        def head_object(self, Bucket, Key):
            raise ClientError({"Error": {"Code": "404"}}, "HeadObject")

    monkeypatch.setattr(mod.boto3, "client", lambda *args, **kwargs: FakeS3())

    assert mod.already_sent_marker(datetime.date(2026, 2, 18), use_s3=True) is False


def test_s3_write_sent_marker(load_module, monkeypatch):
    mod = load_module()
    monkeypatch.setattr(mod, "S3_BUCKET", "bucket")
    monkeypatch.setattr(mod, "AWS_ACCESS_KEY_ID", "key")
    monkeypatch.setattr(mod, "AWS_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setattr(mod, "AWS_REGION", "us-east-1")
    put_calls = {}

    class FakeS3:
        def put_object(self, Bucket, Key, Body):
            put_calls["Bucket"] = Bucket
            put_calls["Key"] = Key
            put_calls["Body"] = Body
            return {"ETag": "etag"}

    monkeypatch.setattr(mod.boto3, "client", lambda *args, **kwargs: FakeS3())

    assert mod.write_sent_marker(datetime.date(2026, 2, 18), use_s3=True) is True
    assert put_calls["Bucket"] == "bucket"


def test_siliconflow_generate_bytes_success(load_module, monkeypatch):
    mod = load_module()
    monkeypatch.setattr(mod, "TEST_MODE", False)
    monkeypatch.setattr(mod, "SILICONFLOW_BASE_URL", "https://example.com")

    png_bytes = b"\x89PNG\r\n\x1a\n" + b"data"

    class FakeResp:
        def __init__(self, status_code, payload=None, text="", headers=None):
            self.status_code = status_code
            self._payload = payload or {}
            self.text = text
            self.headers = headers or {}

        def json(self):
            return self._payload

        def raise_for_status(self):
            return None

    post_calls = {"count": 0}

    def fake_post(*args, **kwargs):
        post_calls["count"] += 1
        if post_calls["count"] == 1:
            return FakeResp(500, text="server error")
        return FakeResp(
            200, payload={"images": [{"url": "https://example.com/img.png"}]}
        )

    def fake_get(*args, **kwargs):
        resp = FakeResp(200)
        resp.content = png_bytes
        return resp

    monkeypatch.setattr(mod.requests, "post", fake_post)
    monkeypatch.setattr(mod.requests, "get", fake_get)
    monkeypatch.setattr(mod.time, "sleep", lambda *args, **kwargs: None)

    data = mod.siliconflow_generate_bytes("key", "model", "prompt")
    assert data == png_bytes


def test_generate_and_cache_creates_file(load_module, monkeypatch, tmp_path):
    mod = load_module()
    target = tmp_path / "final.png"

    def fake_cache_path(juz, date_tag=None):
        return str(target)

    monkeypatch.setattr(mod, "cache_path_for_juz", fake_cache_path)
    monkeypatch.setattr(
        mod, "siliconflow_generate_bytes", lambda *args, **kwargs: b"raw"
    )
    monkeypatch.setattr(
        mod, "overlay_quran_text_bytes", lambda *args, **kwargs: b"final"
    )

    data, path = mod.generate_and_cache(5, force=True, date_tag="2026-02-18")
    assert data == b"final"
    assert path == str(target)
    assert target.read_bytes() == b"final"


def test_send_today_sends_and_marks(load_module, monkeypatch, tmp_path):
    mod = load_module()
    monkeypatch.setattr(mod, "TEST_MODE", True)
    monkeypatch.setattr(mod, "CACHE_DIR", str(tmp_path / "cache"))
    monkeypatch.setattr(mod, "MARKER_DIR", str(tmp_path / "markers"))
    (tmp_path / "cache").mkdir(parents=True, exist_ok=True)
    (tmp_path / "markers").mkdir(parents=True, exist_ok=True)

    fixed_date = datetime.date(2026, 2, 18)
    tz = mod.pytz.timezone(mod.TZ)

    class FakeDateTime(datetime.datetime):
        @classmethod
        def now(cls, tzinfo=None):
            return tz.localize(datetime.datetime(2026, 2, 18, 5, 0))

    monkeypatch.setattr(mod, "dt", FakeDateTime)
    monkeypatch.setattr(mod, "get_today_ramadan_day", lambda: 2)

    res = mod.send_today(force=True)
    assert res.get("sent") is True
    assert mod.already_sent_marker(fixed_date, use_s3=False) is True


def test_send_via_email_sms_test_mode(load_module, monkeypatch, temp_image):
    mod = load_module()
    monkeypatch.setattr(mod, "TEST_MODE", True)

    class BoomSMTP:
        def __init__(self, *args, **kwargs):
            raise AssertionError("SMTP should not be called in test mode")

    monkeypatch.setattr(mod.smtplib, "SMTP", BoomSMTP)

    mod.send_via_email_sms(
        str(temp_image),
        "Subject",
        "Body",
        recipients=["test@tmomail.net"],
    )
