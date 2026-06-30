from __future__ import annotations

import flask

default = flask.Blueprint('default', __name__)


@default.route('/')
def default_endpoint() -> flask.Response | dict[str, str]:
    try:
        return flask.current_app.send_static_file('index.html')
    except Exception:
        return {'message': 'success'}
