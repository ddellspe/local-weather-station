from __future__ import annotations

from unittest.mock import mock_open
from unittest.mock import patch

import flask

from local_weather_server.server.app import app


def _test_call_default(server, query_params=None):
    return server.client.get(
        flask.url_for('default.default_endpoint'),
        query_string=query_params,
    )


def test_it_returns_failure_with_wrong_query_parameters(server):
    resp = _test_call_default(server)
    assert resp.json == {'message': 'success'}


def test_default_endpoint_serves_html_with_title(server):
    mock_html = '<html><head><title>Original Title</title></head></html>'
    mock_open_func = 'local_weather_server.server.servlets.default.open'
    with patch(mock_open_func, mock_open(read_data=mock_html)):
        with patch.dict('os.environ', {'SITE_TITLE': 'My Custom Title'}):
            resp = _test_call_default(server)
            assert resp.response.status_code == 200
            expected = (
                '<html><head><title>My Custom Title</title></head></html>'
            )
            assert resp.text == expected
            assert resp.response.mimetype == 'text/html'


def test_default_endpoint_fallback_when_no_static_folder(server):
    with patch.object(app, '_static_folder', None):
        resp = _test_call_default(server)
        assert resp.json == {'message': 'success'}
