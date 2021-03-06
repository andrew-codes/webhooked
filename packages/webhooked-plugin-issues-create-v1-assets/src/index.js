const createV1 = require('@andrew-codes/v1sdk-fetch');
const GitHub = require('github-api');
const { isEmpty } = require('lodash');
const {
  matchesActions,
} = require('@andrew-codes/webhooked-github-request-matchers');
const {
  InvalidOptionsError,
  validatePropsAreNumeric,
  validatePropsAreStrings,
  validatePropsExists,
} = require('@andrew-codes/webhooked-utils');

module.exports = async (req, options) => {
  ensureOptionsAreValid(options);
  const { scope, team } = options;
  const {
    v1: { host, instance, isHttps, port, token },
    gh,
  } = options.connection;
  const v1Api = createV1({
    host,
    instance,
    port,
    isHttps,
    token,
  });
  const ghApi = new GitHub({ token: gh.token });
  const issues = ghApi.getIssues();

  if (matchesActions(req, ['labeled'], options.connection.gh.hmacKey)) {
    const matchedAssetLabelMapping = Object.entries(options.assetToLabel).find(
      mapping => {
        const value = mapping[1];
        return value === req.body.label.name;
      },
    );
    if (isEmpty(matchedAssetLabelMapping)) {
      return;
    }
    const assetType = matchedAssetLabelMapping[0];
    const { _oid } = await v1Api.create(assetType, {
      links: { name: 'Github Issue', url: req.body.issue.url },
      name: req.body.issue.title,
      scope,
      taggedWith: [`github-${req.body.issue.number}`, 'github'],
      team,
    });
    return await issues.editIssue(req.body.issue.number, {
      labels: [`v1-${_oid}`, 'v1'],
    });
  }
};

function ensureOptionsAreValid(options) {
  if (!options) {
    throw new InvalidOptionsError();
  }
  const validationErrors = validateOptions(options);
  if (!isEmpty(validationErrors)) {
    throw new InvalidOptionsError(validationErrors);
  }
}

function validateOptions(options) {
  if (!options.connection) {
    return ['Missing connection option'];
  }
  let errors = [];
  const missingConnectionErrors = validatePropsExists(
    options.connection,
    ['gh', 'v1'],
    p => `Missing ${p} connection option`,
  );
  errors = errors.concat(missingConnectionErrors);
  if (isEmpty(missingConnectionErrors)) {
    errors = errors
      .concat(
        validatePropsAreStrings(
          options.connection.gh,
          ['token', 'hmacKey'],
          p => `Invalid gh connection ${p} option`,
        ),
      )
      .concat(
        validatePropsAreStrings(
          options.connection.v1,
          ['host', 'instance', 'token', 'hmacKey'],
          p => `Invalid v1 connection ${p} option`,
        ),
      )
      .concat(
        validatePropsAreNumeric(
          options.connection.v1,
          ['port'],
          p => `Invalid v1 connection ${p} option`,
        ),
      );
  }
  errors = errors
    .concat(
      validatePropsAreStrings(
        options.assetToLabel || {},
        ['Story', 'Defect'],
        p => `Invalid ${p} asset to label mapping value`,
      ),
    )
    .concat(
      validatePropsAreStrings(
        options,
        ['scope', 'webhookId'],
        p => `Invalid ${p} option`,
      ),
    );

  return errors;
}
