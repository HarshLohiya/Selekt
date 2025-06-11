const configItems = [
  {
    key: 'allowedDomains',
    envVar: 'SELEKT_ALLOWED_DOMAINS',
    default: '',
  },
  {
    key: 'config',
    envVar: 'SELEKT_CONFIG',
    default: '',
  },
  {
    key: 'migrate',
    envVar: 'SELEKT_MIGRATE',
    default: '',
  },
  {
    key: 'cookieName',
    envVar: 'SELEKT_COOKIE_NAME',
    default: 'selekt.sid',
  },
  {
    key: 'cookieSecret',
    envVar: 'SELEKT_COOKIE_SECRET',
    default: 'secret-used-to-sign-cookies-please-set-and-make-strong',
  },
  {
    key: 'cookieSecure',
    envVar: 'SELEKT_COOKIE_SECURE',
    default: false,
  },
  {
    key: 'sessionMinutes',
    envVar: 'SELEKT_SESSION_MINUTES',
    default: 60,
  },
  {
    key: 'sessionCookieSameSite',
    envVar: 'SELEKT_SESSION_COOKIE_SAME_SITE',
    default: 'strict',
  },
  {
    key: 'sessionStore',
    envVar: 'SELEKT_SESSION_STORE',
    default: 'file', // database, redis, memory
  },
  {
    key: 'timeoutSeconds',
    envVar: 'SELEKT_TIMEOUT_SECONDS',
    default: 300,
  },
  {
    key: 'bodyLimit',
    envVar: 'SELEKT_BODY_LIMIT',
    default: '1mb',
  },
  {
    key: 'ip',
    envVar: 'SELEKT_IP',
    default: '0.0.0.0',
  },
  {
    key: 'port',
    envVar: 'SELEKT_PORT',
    default: 80,
  },
  {
    key: 'systemdSocket',
    envVar: 'SELEKT_SYSTEMD_SOCKET',
    default: false,
  },
  {
    key: 'dbPath',
    envVar: 'SELEKT_DB_PATH',
    default: '',
  },
  {
    key: 'dbAutomigrate',
    envVar: 'SELEKT_DB_AUTOMIGRATE',
    default: true,
  },
  {
    key: 'baseUrl',
    envVar: 'SELEKT_BASE_URL',
    default: '',
  },
  {
    key: 'passphrase',
    envVar: 'SELEKT_PASSPHRASE',
    default: "At least the sensitive bits won't be plain text?",
  },
  {
    key: 'certPassphrase',
    envVar: 'SELEKT_HTTPS_CERT_PASSPHRASE',
    default: '',
  },
  {
    key: 'keyPath',
    envVar: 'SELEKT_HTTPS_KEY_PATH',
    default: '',
  },
  {
    key: 'certPath',
    envVar: 'SELEKT_HTTPS_CERT_PATH',
    default: '',
  },
  {
    key: 'admin',
    envVar: 'SELEKT_ADMIN',
    default: '',
  },
  {
    key: 'adminPassword',
    envVar: 'SELEKT_ADMIN_PASSWORD',
    default: '',
  },
  {
    key: 'defaultConnectionId',
    envVar: 'SELEKT_DEFAULT_CONNECTION_ID',
    default: '',
  },
  {
    key: 'googleClientId',
    envVar: 'SELEKT_GOOGLE_CLIENT_ID',
    default: '',
  },
  {
    key: 'googleClientSecret',
    envVar: 'SELEKT_GOOGLE_CLIENT_SECRET',
    default: '',
  },
  {
    key: 'googleDefaultRole',
    envVar: 'SELEKT_GOOGLE_DEFAULT_ROLE',
    default: 'editor',
  },
  {
    key: 'publicUrl',
    envVar: 'PUBLIC_URL',
    default: '',
  },
  {
    key: 'userpassAuthDisabled',
    envVar: 'SELEKT_USERPASS_AUTH_DISABLED',
    default: false,
  },
  {
    key: 'ldapAuthEnabled',
    envVar: 'SELEKT_LDAP_AUTH_ENABLED',
    default: false,
  },
  {
    key: 'ldapUrl',
    envVar: 'SELEKT_LDAP_URL',
    default: '',
  },
  {
    key: 'ldapSearchBase',
    envVar: 'SELEKT_LDAP_SEARCH_BASE',
    default: '',
  },
  {
    key: 'ldapBindDN',
    envVar: 'SELEKT_LDAP_BIND_DN',
    default: '',
  },
  {
    key: 'ldapPassword',
    envVar: 'SELEKT_LDAP_PASSWORD',
    default: '',
  },
  {
    key: 'ldapSearchFilter',
    envVar: 'SELEKT_LDAP_SEARCH_FILTER',
    default: '',
  },
  {
    key: 'ldapAutoSignUp',
    envVar: 'SELEKT_LDAP_AUTO_SIGN_UP',
    default: '',
  },
  {
    key: 'ldapDefaultRole',
    envVar: 'SELEKT_LDAP_DEFAULT_ROLE',
    default: '',
  },
  {
    key: 'ldapRoleAdminFilter',
    envVar: 'SELEKT_LDAP_ROLE_ADMIN_FILTER',
    default: '',
  },
  {
    key: 'ldapRoleEditorFilter',
    envVar: 'SELEKT_LDAP_ROLE_EDITOR_FILTER',
    default: '',
  },
  {
    key: 'serviceTokenSecret',
    envVar: 'SELEKT_SERVICE_TOKEN_SECRET',
    default: '',
  },
  {
    key: `authDisabled`,
    envVar: 'SELEKT_AUTH_DISABLED',
    default: false,
  },
  {
    key: 'authDisabledDefaultRole',
    envVar: 'SELEKT_AUTH_DISABLED_DEFAULT_ROLE',
    default: 'editor',
  },
  {
    key: 'allowCsvDownload',
    envVar: 'SELEKT_ALLOW_CSV_DOWNLOAD',
    default: true,
  },
  {
    key: 'editorWordWrap',
    envVar: 'SELEKT_EDITOR_WORD_WRAP',
    default: false,
  },
  {
    key: 'queryResultMaxRows',
    envVar: 'SELEKT_QUERY_RESULT_MAX_ROWS',
    default: 10000,
  },
  {
    key: 'queryResultStore',
    envVar: 'SELEKT_QUERY_RESULT_STORE',
    default: 'file', // allowed values file, memory, database
  },
  {
    key: 'samlEntryPoint',
    envVar: 'SELEKT_SAML_ENTRY_POINT',
    default: '',
  },
  {
    key: 'samlIssuer',
    envVar: 'SELEKT_SAML_ISSUER',
    default: '',
  },
  {
    key: 'samlCallbackUrl',
    envVar: 'SELEKT_SAML_CALLBACK_URL',
    default: '',
  },
  {
    key: 'samlCert',
    envVar: 'SELEKT_SAML_CERT',
    default: '',
  },
  {
    key: 'samlAuthContext',
    envVar: 'SELEKT_SAML_AUTH_CONTEXT',
    default: '',
  },
  {
    key: 'samlLinkHtml',
    envVar: 'SELEKT_SAML_LINK_HTML',
    default: 'Sign in with SSO',
  },
  {
    key: 'samlAutoSignUp',
    envVar: 'SELEKT_SAML_AUTO_SIGN_UP',
    default: false,
  },
  {
    key: 'samlDefaultRole',
    envVar: 'SELEKT_SAML_DEFAULT_ROLE',
    default: 'editor',
  },
  {
    key: 'samlAdminGroup',
    envVar: 'SELEKT_SAML_ADMIN_GROUP',
    default: '',
  },
  {
    key: 'samlEnforcedRole',
    envVar: 'SELEKT_SAML_ENFORCED_ROLE',
    default: false,
  },
  {
    key: 'allowConnectionAccessToEveryone',
    envVar: 'SELEKT_ALLOW_CONNECTION_ACCESS_TO_EVERYONE',
    default: true,
  },
  {
    key: 'queryHistoryRetentionTimeInDays',
    envVar: 'SELEKT_QUERY_HISTORY_RETENTION_TIME_IN_DAYS',
    default: 30,
  },
  {
    key: 'queryHistoryResultMaxRows',
    envVar: 'SELEKT_QUERY_HISTORY_RESULT_MAX_ROWS',
    default: 1000,
  },
  {
    key: 'appLogLevel',
    envVar: 'SELEKT_APP_LOG_LEVEL',
    default: 'info',
  },
  {
    key: 'webLogLevel',
    envVar: 'SELEKT_WEB_LOG_LEVEL',
    default: 'info',
  },
  {
    key: 'dbInMemory',
    envVar: 'SELEKT_DB_IN_MEMORY',
    default: false,
  },
  {
    key: 'backendDatabaseUri',
    envVar: 'SELEKT_BACKEND_DB_URI',
    default: '',
  },
  {
    key: 'redisUri',
    envVar: 'SELEKT_REDIS_URI',
    default: '',
  },
  {
    key: 'seedDataPath',
    envVar: 'SELEKT_SEED_DATA_PATH',
    default: '',
  },
  // https://expressjs.com/en/guide/behind-proxies.html
  {
    key: 'trustProxy',
    envVar: 'SELEKT_TRUST_PROXY',
    default: false,
  },
  {
    key: 'authProxyEnabled',
    envVar: 'SELEKT_AUTH_PROXY_ENABLED',
    default: false,
  },
  {
    key: 'authProxyAutoSignUp',
    envVar: 'SELEKT_AUTH_PROXY_AUTO_SIGN_UP',
    default: false,
  },
  {
    key: 'authProxyDefaultRole',
    envVar: 'SELEKT_AUTH_PROXY_DEFAULT_ROLE',
    default: '',
  },
  // Define headers to map to user attributes, space delimited
  // At a minimum, email or id must be mapped, as they will be used as a user identifier
  // Other attributes may be mapped as well, including data attributes via data.somePropertyName
  // Example `id:X-WEBAUTH-ID email:X-WEBAUTH-EMAIL name:X-WEBAUTH-NAME role:X-WEBAUTH-ROLE data.field:X-WEBAUTH-field`
  {
    key: 'authProxyHeaders',
    envVar: 'SELEKT_AUTH_PROXY_HEADERS',
    default: '',
  },
  {
    key: 'oidcClientId',
    envVar: 'SELEKT_OIDC_CLIENT_ID',
    default: '',
  },
  {
    key: 'oidcClientSecret',
    envVar: 'SELEKT_OIDC_CLIENT_SECRET',
    default: '',
  },
  {
    key: 'oidcIssuer',
    envVar: 'SELEKT_OIDC_ISSUER',
    default: '',
  },
  {
    key: 'oidcAuthorizationUrl',
    envVar: 'SELEKT_OIDC_AUTHORIZATION_URL',
    default: '',
  },
  {
    key: 'oidcTokenUrl',
    envVar: 'SELEKT_OIDC_TOKEN_URL',
    default: '',
  },
  {
    key: 'oidcUserInfoUrl',
    envVar: 'SELEKT_OIDC_USER_INFO_URL',
    default: '',
  },
  {
    key: 'oidcLinkHtml',
    envVar: 'SELEKT_OIDC_LINK_HTML',
    default: 'Sign in with OpenID',
  },
  {
    key: 'oidcScope',
    envVar: 'SELEKT_OIDC_SCOPE',
    default: 'openid profile email roles',
  },
  {
    key: 'webhookEnabled',
    envVar: 'SELEKT_WEBHOOK_ENABLED',
    default: false,
  },
  {
    key: 'webhookSecret',
    envVar: 'SELEKT_WEBHOOK_SECRET',
    default: '',
  },
  {
    key: 'webhookUserCreatedUrl',
    envVar: 'SELEKT_WEBHOOK_USER_CREATED_URL',
    default: '',
  },
  {
    key: 'webhookQueryCreatedUrl',
    envVar: 'SELEKT_WEBHOOK_QUERY_CREATED_URL',
    default: '',
  },
  {
    key: 'webhookBatchCreatedUrl',
    envVar: 'SELEKT_WEBHOOK_BATCH_CREATED_URL',
    default: '',
  },
  {
    key: 'webhookBatchFinishedUrl',
    envVar: 'SELEKT_WEBHOOK_BATCH_FINISHED_URL',
    default: '',
  },
  {
    key: 'webhookStatementCreatedUrl',
    envVar: 'SELEKT_WEBHOOK_STATEMENT_CREATED_URL',
    default: '',
  },
  {
    key: 'webhookStatementFinishedUrl',
    envVar: 'SELEKT_WEBHOOK_STATEMENT_FINISHED_URL',
    default: '',
  },
  {
    key: 'deprecatedTestConfig',
    envVar: 'SELEKT_DEPRECATED_TEST_CONFIG',
    default: '',
    deprecated: 'Deprecated config identified with this key and message',
  },
];

export default configItems;
