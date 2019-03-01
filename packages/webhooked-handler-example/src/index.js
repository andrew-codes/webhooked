const {
  isRequestFromGithub,
} = require('@andrew-codes/webhooked-github-request-matchers');

module.exports = async req => {
  if (isRequestFromGithub(req)) {
    console.log('Do something, I am a request from Github');
  }
};
