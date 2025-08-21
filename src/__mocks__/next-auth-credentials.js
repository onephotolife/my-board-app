// NextAuth Credentials Provider Mock
module.exports = function Credentials(config) {
  return {
    id: 'credentials',
    name: 'credentials',
    type: 'credentials',
    credentials: config.credentials,
    authorize: config.authorize,
  };
};

module.exports.default = module.exports;