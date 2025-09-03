CI helper scripts

Usage:

  # run tests locally
  ./ci/test.sh

  # run linters
  ./ci/lint.sh

  # deploy (placeholder)
  ./ci/deploy.sh

  # secret scan
  ./ci/secret_scan.sh

These scripts are intentionally minimal and safe to run in CI and locally. Edit them
to integrate real deploy and verification steps for your environment.
