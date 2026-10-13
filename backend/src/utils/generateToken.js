const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwtConfig');

const generateToken = (id) => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: '30d',
  });
};

module.exports = generateToken;
