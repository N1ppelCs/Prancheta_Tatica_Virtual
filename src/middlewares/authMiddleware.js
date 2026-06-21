function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  // Return JSON 401 error for fetch/XHR requests, otherwise redirect to admin login page
  if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  res.redirect('/admin/login');
}

module.exports = {
  requireAdmin
};
