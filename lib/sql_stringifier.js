const Assert = require('assert')

class SqlStringifer {
  static stringifyInsert(ast) {
    Assert.strictEqual(ast.whatami$, 'insert_t')

    let sql = ''

    sql += 'insert into'
    sql += ' ' + SqlStringifer.stringifyTable(ast.into$)

    if (ast.column_names$) {
      const safe_column_names = ast.column_names$.map(name => doubleQuoted(name))
      sql += ' ' + parenthesized(safe_column_names.join(', '))
    }

    if (ast.what$.whatami$ === 'insert_values_t') {
      const sql_values = ast.what$.values$
        .map(token => SqlStringifer.stringifyValue(token))
        .join(', ')

      sql += ' values ' + parenthesized(sql_values)
    } else {
      throw new Error('Unsupported ast.what$ token type: ' +
        `${ast.what$.whatami$}`)
    }

    return sql
  }

  static stringifyTable(ast) {
    Assert.strictEqual(ast.whatami$, 'table_t')

    if (ast.alias$) {
      return [ast.name$, ast.alias$].join(' as ')
    }

    return ast.name$
  }

  static stringifyValue(ast) {
    Assert.strictEqual(ast.whatami$, 'value_t')

    if (null == ast.value$) {
      return 'null'
    }

    if (typeof ast.value$ === 'string') {
      return singleQuoted(escapeString(ast.value$))
    }

    if (typeof ast.value$ === 'number') {
      return JSON.stringify(ast.value$)
    }

    if (ast.value$.constructor === Date) {
      return quoted(ast.value$.toISOString())
    }

    throw new Error('Support is not implemented for values of type like:' +
      `${ast.value$}`)
  }
}

function parenthesized(s) {
  return '(' + s + ')'
}

function singleQuoted(s) {
  return "'" + s + "'"
}

function doubleQuoted(s) {
  return '"' + s + '"'
}

function escapeString(str) {
  Assert.strictEqual(typeof str, 'string', 'str')

  return str.replace(/./g, c => {
    switch (c) {
      case '\0': return '\\0'

      case '\x08':
        return '\\b'

      case '\b':
        return '\\b'

      case '\x09':
        return '\\t'

      case '\t':
        return '\\t'

      case '\x1a':
        return '\\z'

      case '\n':
        return '\\n'

      case '\r':
        return '\\r'

      case '"': case '\'': case '\\':
      case '%': case '`':
        return '\\' + c

      default:
        return c
    }
  })
}

module.exports = SqlStringifer
