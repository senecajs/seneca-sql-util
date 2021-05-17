const Assert = require('assert')

class SqlStringifer {
  static stringifySelect(ast) {
    Assert.strictEqual(ast.whatami$, 'select_t')

    let sql = ''

    sql += 'select'

    if (ast.columns$ === '*') {
      sql += ' *'
    } else {
      Assert(Array.isArray(ast.columns$), 'ast.columns$')

      const sql_cols = ast.columns$.map(col => {
        if (col.whatami$ === 'column_t') {
          return SqlStringifer.stringifyColumn(col)
        }

        if (col.whatami$ === 'value_t') {
          return SqlStringifer.stringifyValue(col)
        }

        throw new Error('The column token type is not supported: ' +
          `${col.whatami$}`)
      })

      sql += ' ' + sql_cols.join(', ')
    }

    sql += ' from ' + SqlStringifer.stringifyTable(ast.from$)
    
    if (null != ast.where$) {
      sql += ' where ' + SqlStringifer.stringifyExpr(ast.where$)
    }

    if (null != ast.order_by$) {
      sql += ' ' + SqlStringifer.stringifyOrderBy(ast.order_by$)
    }

    if (null != ast.limit$) {
      sql += ' ' + SqlStringifer.stringifyLimit(ast.limit$)
    }

    return sql
  }

  static stringifyOrderBy(ast) {
    Assert.strictEqual(ast.whatami$, 'order_by_t')

    let sql = ''

    const sql_terms = ast.terms$.map(term => {
      Assert.strictEqual(term.whatami$, 'ordering_term_t')

      const sql_col = SqlStringifer.stringifyColumn(term.column$)
      const order = term.order$

      Assert(['asc', 'desc'].includes(order), 'order$')

      return [sql_col, order].join(' ')
    })

    sql += 'order by ' + sql_terms.join(', ')

    return sql
  }

  static stringifyLimit(ast) {
    Assert.strictEqual(ast.whatami$, 'limit_t')

    let sql = ''
    sql += 'limit ' + SqlStringifer.stringifyValue(ast.limit$)

    if (null != ast.offset$) {
      sql += ' offset ' + SqlStringifer.stringifyValue(ast.offset$)
    }

    return sql
  }

  static stringifyInsert(ast) {
    Assert.strictEqual(ast.whatami$, 'insert_t')

    let sql = ''

    sql += 'insert into'
    sql += ' ' + SqlStringifer.stringifyTable(ast.into$)

    if (ast.column_names$) {
      sql += ' ' + parenthesized(ast.column_names$.join(', '))
    }

    Assert(null != ast.what$)
    Assert.strictEqual(ast.what$.whatami$, 'insert_values_t')

    const sql_values = ast.what$.values$
      .map(token => SqlStringifer.stringifyValue(token))
      .join(', ')

    sql += ' values ' + parenthesized(sql_values)

    if (ast.what$.upsert$) {
      sql += ' ' + SqlStringifer.stringifyUpsert(ast.what$.upsert$)
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
      return ast.name$
    }

    return [ast.alias$, ast.name$]
      .map(token => token)
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

    const sql_value = (() => {
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
    })()

    if (ast.alias$) {
      return [sql_value, ast.alias$].join(' as ')
    }

    return sql_value
  }
  
  static stringifyUnaryExpr(ast) {
    Assert.strictEqual(ast.whatami$, 'unary_expr_t')
    
    const sql_expr = SqlStringifer.stringifyExpr(ast.expr$)
    
    if (ast.op_kind$ === 'not') {
      return 'not ' + parenthesized(sql_expr)
    }
    
    if (ast.op_kind$ === 'null') {
      return parenthesized(sql_expr) + ' is null'
    }
    
    throw new Error('Support for the unary operator not implemented: ' + `${ast.op_kind$}`)
  }
 
  static stringifyBinaryExpr(ast) {
    Assert.strictEqual(ast.whatami$, 'binary_expr_t')
    
    const sql_lexpr = SqlStringifer.stringifyExpr(ast.lexpr$)
    const sql_rexpr = SqlStringifer.stringifyExpr(ast.rexpr$)
    
    const is_valid_op = ['in', 'between', '+', '-', '*', '/', '>=', '>', '<', '<=', 'and', 'or']
    
    if (is_valid_op) {
      return [sql_lexpr, sql_rexpr].join(` ${ast.op_kind$} `)
    }
    
    throw new Error('Support for the binary operator not implemented: ' + `${ast.op_kind$}`)
  }

  static stringifyTuple(ast) {
    Assert(Array.isArray(ast))
    
    const tuple_sql = ast.map(token => SqlStringifer.stringifyExpr(token)).join(', ')
    
    return parenthesized(tuple_sql)
  }

  static stringifyExpr(ast) {
    if (Array.isArray(ast)) {
        return SqlStringifer.stringifyTuple(ast)
    }
    
    if (ast.whatami$ === 'column_t') {
      return SqlStringifer.stringifyColumn(ast)
    }
    
    if (ast.whatami$ === 'value_t') {
      return SqlStringifer.stringifyValue(ast)
    }

    if (ast.whatami$ === 'unary_expr_t') {
      return SqlStringifer.stringifyUnaryExpr(ast)
    }

    if (ast.whatami$ === 'binary_expr_t') {
      return SqlStringifer.stringifyBinaryExpr(ast)
    }
    
    throw new Error('Unknown expr_t token type: ' + `${ast.whatami$}`)
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
