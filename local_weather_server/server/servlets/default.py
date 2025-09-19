from __future__ import annotations

import flask

default = flask.Blueprint('default', __name__)


@default.route('/')
def default_endpoint() -> dict[str, str]:
    return {'message': 'success'}
