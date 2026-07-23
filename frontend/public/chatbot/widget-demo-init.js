(function () {
  var p = new URLSearchParams(location.search)
  window.__CHATBOT_CLIENT_ID__ = p.get('client_id') || 'aaa'
  var api = p.get('api')
  if (api) window.__CHATBOT_API_BASE_URL__ = api
  var token = p.get('token')
  if (token) window.__CHATBOT_API_TOKEN__ = token
  var title = document.getElementById('demo-title')
  if (title) title.textContent = 'Démo widget SaaS (' + window.__CHATBOT_CLIENT_ID__ + ')'
})()
