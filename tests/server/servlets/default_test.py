from __future__ import annotations

import flask


def _test_call_default(server, query_params=None):
    return server.client.get(
        flask.url_for('default.default_endpoint'),
        query_string=query_params,
    )


def test_it_returns_failure_with_wrong_query_parameters(server):
    resp = _test_call_default(server)
    assert resp.json == {'message': 'success'}
