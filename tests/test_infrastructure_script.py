import os
from unittest.mock import MagicMock


def test_infrastructure_wrapper_skips_by_default(monkeypatch):
    # Ensure wrapper will skip when RUN_INFRA_TESTS not set
    monkeypatch.delenv('RUN_INFRA_TESTS', raising=False)
    # Import the wrapper module and ensure pytestmark exists
    import importlib
    mod = importlib.import_module('infrastructure.tests.test_integration_wrapper')
    assert hasattr(mod, 'pytestmark')


def test_infrastructure_class_methods_monkeypatch(monkeypatch):
    # Monkeypatch psycopg2 and pika so methods can be invoked without services
    fake_conn = MagicMock()
    fake_cursor = MagicMock()
    fake_conn.cursor.return_value.__enter__.return_value = fake_cursor

    fake_psycopg = MagicMock()
    fake_psycopg.connect.return_value = fake_conn
    monkeypatch.setitem(os.environ, 'POSTGRES_DB', 'testdb')
    monkeypatch.setitem(os.environ, 'POSTGRES_USER', 'postgres')
    monkeypatch.setattr('infrastructure.scripts.test_infrastructure.psycopg2', fake_psycopg)

    fake_pika = MagicMock()
    fake_blocking = MagicMock()
    fake_blocking.channel.return_value = MagicMock()
    fake_pika.BlockingConnection.return_value = fake_blocking
    monkeypatch.setattr('infrastructure.scripts.test_infrastructure.pika', fake_pika)

    from infrastructure.scripts.test_infrastructure import TestInfrastructure
    t = TestInfrastructure()
    # connect_postgres should return True given our mocks
    assert t.connect_postgres() is True
