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

      if (ast.what$.upsert$) {
        sql += ' ' + SqlStringifer.stringifyUpsert(ast.what$.upsert$)
      }
    } else {
      throw new Error('Unsupported ast.what$ token type: ' +
        `${ast.what$.whatami$}`)
    }

    return sql
  }

  static stringifyUpsert(ast) {
    Assert.strictEqual(ast.whatami$, 'upsert_t')

    let sql = ''
    sql += 'on conflict'

    const sql_conflict_cols = ast.on_conflict_with$
      .map(col => SqlStringifer.stringifyColumn(col))

    sql += ' ' + parenthesized(sql_conflict_cols)
    sql += ' do'

    if (typeof ast.do_what$ === 'string') {
      Assert.strictEqual(ast.do_what$, 'nothing')
      sql += ' nothing'
    } else {
      Assert(null != ast.do_what$, 'ast.do_what$')
      Assert.strictEqual(ast.do_what$.whatami$, 'upsert_update_t')

      sql += ' update set'

      const sql_set = ast.do_what$.set$.map(([col, rval]) => {
        const sql_k = SqlStringifer.stringifyColumn(col)
        const sql_v = SqlStringifer.stringifyValue(rval)

        return [sql_k, sql_v].join(' = ')
      }).join(',')

      sql += ' ' + sql_set
    }

    return sql
  }

  static stringifyColumn(ast) {
    Assert.strictEqual(ast.whatami$, 'column_t')

    if (null == ast.alias$) {
      return doubleQuoted(ast.name$)
    }

    return [ast.alias$, ast.name$]
      .map(token => doubleQuoted(token))
      .join('.')
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
      return singleQuoted(ast.value$.toISOString())
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
