import os
import pytest

# Only run these tests when explicitly enabled (RUN_INFRA_TESTS=1). By default
# they are skipped so unit-test runs remain fast and deterministic.
pytestmark = pytest.mark.skipif(
    os.getenv('RUN_INFRA_TESTS', '0') != '1',
    reason='Integration tests are disabled; set RUN_INFRA_TESTS=1 to enable',
)

from infrastructure.scripts.test_infrastructure import TestInfrastructure


def test_infrastructure_all():
    tester = TestInfrastructure()
    try:
        assert tester.test_all() is not None
    finally:
        tester.close()
