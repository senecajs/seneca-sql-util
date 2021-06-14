const Assert = require('assert-plus')

class QueryBuilder {
  static queryOfRawSql(node) {
    Assert.strictEqual(node.whatami$, 'raw_sql_t')

    const values = node.raw_values$

    return makeResult({ sql: node.raw_sql$, values })
  }

  static queryOfSelect(node) {
    Assert.strictEqual(node.whatami$, 'select_t')

    const q = { sql: '', values: [] }

    q.sql += 'select'

    Assert(Array.isArray(node.columns$), 'node.columns$')

    const cols_qs = node.columns$.map(col => {
      if (col === '*' || col.whatami$ === 'column_t') {
        return QueryBuilder.queryOfColumn(col)
      }

      if (col.whatami$ === 'value_t') {
        return QueryBuilder.queryOfValue(col)
      }

      if (col.whatami$ === 'raw_sql_t') {
        return QueryBuilder.queryOfRawSql(col)
      }

      throw new Error('The column token type is not supported: ' +
        `${col.whatami$}`)
    })

    q.sql += ' ' + cols_qs.map(c => c.sql).join(', ')
    q.values = q.values.concat(...cols_qs.map(c => c.values))


    if (node.from$) {
      const from_q = (() => {
        if (node.from$.whatami$ === 'table_t') {
          return QueryBuilder.queryOfTable(node.from$)
        }

        if (node.from$.whatami$ === 'select_t') {
          const { sql: base_sql, values } = QueryBuilder.queryOfSelect(node.from$)


          let sql
          sql = parenthesized(base_sql)

          if (node.from$.subexpr_alias$) {
            sql += ' as ' + escapeIdentifier(node.from$.subexpr_alias$)
          }

          return makeResult({ sql, values })
        }

        throw new Error('The from-token type is not supported: ' +
          `${node.from$.whatami$}`)
      })()


      q.sql += ' from ' + from_q.sql
      q.values = q.values.concat(from_q.values)
    }


    if (null != node.where$) {
      const where_q = QueryBuilder.queryOfExpr(node.where$)
      q.sql += ' where ' + where_q.sql
      q.values = q.values.concat(where_q.values)
    }

    if (null != node.order_by$) {
      const order_q = QueryBuilder.queryOfOrderBy(node.order_by$)
      q.sql += ' ' + order_q.sql
      q.values = q.values.concat(order_q.values)
    }

    if (null != node.limit$) {
      const limit_q = QueryBuilder.queryOfLimit(node.limit$)
      q.sql += ' ' + limit_q.sql
      q.values = q.values.concat(limit_q.values)
    }

    return makeResult(q)
  }

  static queryOfOrderBy(node) {
    Assert.strictEqual(node.whatami$, 'order_by_t')

    let sql = ''

    const sql_terms = node.terms$.map(term => {
      Assert.strictEqual(term.whatami$, 'ordering_term_t')

      const sql_col = QueryBuilder.queryOfColumn(term.column$)
      const order = term.order$

      Assert(['asc', 'desc'].includes(order), 'order$')

      return [sql_col, order].join(' ')
    })

    sql += 'order by ' + sql_terms.join(', ')

    return sql
  }

  static queryOfLimit(node) {
    Assert.strictEqual(node.whatami$, 'limit_t')

    const q = { sql: '', values: [] }

    const lim_val_q = QueryBuilder.queryOfValue(node.limit$)
    q.sql += 'limit ' + lim_val_q.sql
    q.values = q.values.concat(lim_val_q.values)

    if (null != node.offset$) {
      const offset_val_q = QueryBuilder.queryOfValue(node.offset$)
      q.sql += ' offset ' + offset_val_q.sql
      q.values = q.values.concat(offset_val_q.values)
    }

    return makeResult(q)
  }

  /*
  static queryOfInsert(node) {
    Assert.strictEqual(node.whatami$, 'insert_t')

    let sql = ''

    sql += 'insert into'
    sql += ' ' + QueryBuilder.queryOfTable(node.into$)

    if (node.column_names$) {
      sql += ' ' + parenthesized(node.column_names$.join(', '))
    }

    Assert(null != node.what$)
    Assert.strictEqual(node.what$.whatami$, 'insert_values_t')

    const sql_values = node.what$.values$
      .map(token => QueryBuilder.queryOfValue(token))
      .join(', ')

    sql += ' values ' + parenthesized(sql_values)

    if (node.what$.upsert$) {
      sql += ' ' + QueryBuilder.queryOfUpsert(node.what$.upsert$)
    }

    return sql
  }

  static queryOfUpsert(node) {
    Assert.strictEqual(node.whatami$, 'upsert_t')

    let sql = ''
    sql += 'on conflict'

    const sql_conflict_cols = node.on_conflict_with$
      .map(col => QueryBuilder.queryOfColumn(col))

    sql += ' ' + parenthesized(sql_conflict_cols)
    sql += ' do'

    if (typeof node.do_what$ === 'string') {
      Assert.strictEqual(node.do_what$, 'nothing')
      sql += ' nothing'
    } else {
      Assert(null != node.do_what$, 'node.do_what$')
      Assert.strictEqual(node.do_what$.whatami$, 'upsert_update_t')

      sql += ' update set'

      const sql_set = node.do_what$.set$.map(([col, rval]) => {
        const sql_k = QueryBuilder.queryOfColumn(col)
        const sql_v = QueryBuilder.queryOfValue(rval)

        return [sql_k, sql_v].join(' = ')
      }).join(',')

      sql += ' ' + sql_set
    }

    return sql
  }
  */

  // TODO:
  //
  // select * from foos
  // select foos.* from foos
  // select `*` from foos
  // select `foos`.* from foos
  // select `foos`.`*` from foos
  //
  // NOTE: `*` is NOT the same as *. `*` is a column name, whereas *
  // means "all columns".
  //
  static queryOfColumn(node) {
    if (node === '*') {
      return makeResult({ sql: '*' })
    }

    Assert.strictEqual(node.whatami$, 'column_t')

    if (node.alias$) {
      return makeResult({
        sql: [node.alias$, node.name$]
          .map(token => escapeIdentifier(token))
          .join('.')
      })
    }

    return makeResult({ sql: escapeIdentifier(node.name$) })
  }

  static queryOfTable(node) {
    Assert.strictEqual(node.whatami$, 'table_t')

    if (node.alias$) {
      return makeResult({
        sql: [node.name$, node.alias$]
          .map(token => escapeIdentifier(token))
          .join(' as ') // TODO: Escape the table name and the alias.
      })
    }

    return makeResult({ sql: escapeIdentifier(node.name$) }) // TODO: Escape the table name.
  }

  static queryOfValue(node) {
    Assert.strictEqual(node.whatami$, 'value_t')

    return makeResult({ sql: preparedStm(), values: [node.value$] })
  }

  static queryOfUnaryExpr(node) {
    Assert.strictEqual(node.whatami$, 'unary_expr_t')
    
    const expr_q = QueryBuilder.queryOfExpr(node.expr$)
    
    if (node.op_kind$ === 'not') {
      return makeResult({
        sql: 'not ' + parenthesized(expr_q.sql),
        values: expr_q.values
      })
    }
    
    if (node.op_kind$ === 'null') {
      return makeResult({
        sql: expr_q.sql + ' is null',
        values: expr_q.values
      })
    }
    
    throw new Error('Support for the unary operator is not implemented: ' +
      `${node.op_kind$}`)
  }
 
  static queryOfBinaryExpr(node) {
    Assert.strictEqual(node.whatami$, 'binary_expr_t')
    
    const lexpr_q = QueryBuilder.queryOfExpr(node.lexpr$)
    const rexpr_q = QueryBuilder.queryOfExpr(node.rexpr$)
    
    const SUPPORTED_BINARY_OP_KINDS = [
      'in', 'between', '+', '-', '*', '/', '>=', '>', '=', '<', '<=', 'and', 'or'
    ]

    const is_valid_op = SUPPORTED_BINARY_OP_KINDS.includes(node.op_kind$)

    if (is_valid_op) {
      return makeResult({
        sql: [lexpr_q.sql, rexpr_q.sql].join(` ${node.op_kind$} `),
        values: lexpr_q.values.concat(rexpr_q.values)
      })
    }

    throw new Error('Support for the binary operator not implemented: ' + `${node.op_kind$}`)
  }

  /*
  static queryOfTuple(node) {
    Assert(Array.isArray(node))
    
    const tuple_sql = node.map(token => QueryBuilder.queryOfExpr(token)).join(', ')
    
    return makeResult({ sql: parenthesized(tuple_sql) })
  }
  */

  static queryOfExpr(node) {
    /*
    if (Array.isArray(node)) {
        return QueryBuilder.queryOfTuple(node)
    }
    */
    
    if (node.whatami$ === 'column_t') {
      return QueryBuilder.queryOfColumn(node)
    }
    
    if (node.whatami$ === 'value_t') {
      return QueryBuilder.queryOfValue(node)
    }

    if (node.whatami$ === 'unary_expr_t') {
      const expr_q = QueryBuilder.queryOfUnaryExpr(node)

      return makeResult({
        sql: parenthesized(expr_q.sql),
        values: expr_q.values
      })
    }

    if (node.whatami$ === 'binary_expr_t') {
      const expr_q = QueryBuilder.queryOfBinaryExpr(node)

      return makeResult({
        sql: parenthesized(expr_q.sql),
        values: expr_q.values
      })
    }

    if (node.whatami$ === 'select_t') {
      const expr_q = QueryBuilder.queryOfSelect(node)

      return makeResult({
        sql: 'exists ' + parenthesized(expr_q.sql),
        values: expr_q.values
      })
    }

    throw new Error('Unknown expr_t token type: ' + `${node.whatami$}`)
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

function preparedStm() {
  return '?'
}

function makeResult(data) {
  Assert.object(data, 'data')
  Assert.string(data.sql, 'data.sql')

  const { sql, values = [] } = data

  return { sql, values }
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

function escapeIdentifier(s) {
  return '`' + escapeString(s) + '`'
}

module.exports = QueryBuilder
