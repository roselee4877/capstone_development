const isAuthenticated = (req, res, next) => {
    req.session.userId = 'right';
    next();
};



module.exports = {
    isAuthenticated
};