from __future__ import annotations

import contextlib
from unittest import mock

import pytest

from local_weather_server.server.app import app
from local_weather_server.server.app import AppContext
from testing.utilities.client import Client


class LocalWeatherServer:
    def __init__(self, client, sandbox):
        self.client = client
        self.sandbox = sandbox


@contextlib.contextmanager
def _patch_app_with_client(application):
    with mock.patch.object(application, 'test_client_class', Client):
        # Make the app always debug so it throws exceptions
        with mock.patch.object(
            type(application), 'debug', mock.PropertyMock(return_value=True),
        ):
            yield


@contextlib.contextmanager
def _in_testing_app_context(application):
    with application.test_request_context():
        with application.test_client() as client:
            yield client


@pytest.fixture
def server(sandbox):
    import os
    with _patch_app_with_client(app), _in_testing_app_context(app) as client:
        with mock.patch.dict(os.environ, {'DB_PATH': sandbox.db_path}):
            with mock.patch.object(
                AppContext, 'database_path', sandbox.db_path,
            ):
                yield LocalWeatherServer(client, sandbox)
