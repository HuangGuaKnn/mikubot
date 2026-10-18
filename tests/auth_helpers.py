"""Exercise the real first-run WebUI password exchange in older API fixtures."""

FIXTURE_PASSWORD = 'fixture-password-v9'


def password_login(client, app, password=FIXTURE_PASSWORD):
    proof = client.post('/api/session', json={'token': app.state.settings.token})
    assert proof.status_code == 200, proof.text
    status = client.get('/api/auth/status')
    assert status.status_code == 200, status.text
    endpoint = '/api/auth/setup' if status.json()['setup_required'] else '/api/auth/login'
    response = client.post(endpoint, json={'password': password})
    assert response.status_code == 200, response.text
    assert client.get('/api/auth/status').json()['authenticated']
    return response
