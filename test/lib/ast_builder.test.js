const Assert = require('assert-plus')
const QueryBuilder = require('../../lib/query_builder') // dbg

function fetchProp(base, prop, assertType = (x, msg) => {}) {
  if (base === null || base === undefined) {
    Assert.fail('Object cannot be null or undefined.')
  }

  const props = (() => {
    if (Array.isArray(prop)) {
      return prop
    }

    return [prop]
  })()

  const x = props.reduce((o, prop) => {
    if (!(prop in o)) {
      Assert.fail(`Missing property: "${prop}"`)
    }

    return o[prop]
  }, base)

  assertType(x, prop)

  return x
}

class SelectNode {
  static make(data) {
    Assert.object(data, 'data')

    const columns$ = fetchProp(data, 'columns$')
    const from$ = data.from$ || null
    const subexpr_alias$ = data.subexpr_alias$ || null

    return { whatami$: 'select_t', columns$, from$, subexpr_alias$ }
  }
}

class TableNode {
  static make(data) {
    Assert.object(data, 'data')

    const name$ = fetchProp(data, 'name$')
    const alias$ = data.alias$ || null

    return { whatami$: 'table_t', name$, alias$ }
  }
}

class ColumnNode {
  static make(data) {
    Assert.object(data, 'data')

    const name$ = fetchProp(data, 'name$')
    const alias$ = data.alias$ || null

    return { whatami$: 'column_t', name$, alias$ }
  }
}

class ValueNode {
  static make(data) {
    Assert.object(data, 'data')

    const value$ = fetchProp(data, 'value$')

    return { whatami$: 'value_t', value$ }
  }
}

class RawSqlNode {
  static make(data) {
    Assert.object(data, 'data')

    const raw_sql$ = fetchProp(data, 'raw_sql$')
    const raw_values$ = data.raw_values$ || null

    return { whatami$: 'raw_sql_t', raw_sql$, raw_values$ }
  }
}

class AstBuilder {
  select(...columns) {
    return new SelectAstBuilder({ columns })
  }
}

class FromAstBuilder {
  constructor(args = {}) {
    this._from = args.from || null
  }

  toAst() {
    Assert(typeof this._from === 'string' ||
      this._from instanceof SelectAstBuilder,
      'Unexpected type of the from-argument')

    if (typeof this._from === 'string') {
      return TableNode.make({ name$: this._from })
    }

    if (this._from instanceof SelectAstBuilder) {
      return this._from.toAst()
    }

    Assert.fail('Expected this._from to have been set')
  }
}

class SelectAstBuilder {
  constructor(args) {
    this._from = args.from || new FromAstBuilder()
    this._columns = args.columns || null
    this._subexpr_alias = args.subexpr_alias || null
  }

  from(what) {
    return new SelectAstBuilder({
      columns: this._columns,
      from: new FromAstBuilder({ from: what }),
      subexpr_alias: this._subexpr_alias
    })
  }

  as(alias) {
    return new SelectAstBuilder({
      columns: this._columns,
      from: this._from,
      subexpr_alias: alias
    })
  }

  toAst() {
    if (this._from) {
      Assert(this._from instanceof FromAstBuilder,
        'must be FromAstBuilder')
    }


    const columns_nodes = this._columns.map(arg => {
      if (typeof arg === 'string') {
        if (arg === '*') {
          return '*'
        }

        return ColumnNode.make({ name$: arg })
      }

      throw new Error('Unexpected type of the column argument')
    })

    return SelectNode.make({
      whatami$: 'select_t',
      columns$: columns_nodes,
      from$: this._from && this._from.toAst(),
      subexpr_alias$: this._subexpr_alias
    })
  }
}

describe('query-building', () => {
  describe('select', () => {
    fit('', () => { // fcs
      const ast = new AstBuilder()
        .select(
          'id', 'age' /*,
          new SelectAstBuilder()
            .raw('age >= ? as is_mature', [18])
            .toAst()*/
        )
        .from(
          new AstBuilder()
            .select('id', 'age')
            .from('users')
            .as('u')
        )
        .toAst()

      console.dir(ast, { depth: 8 }) // dbg

      console.dir(QueryBuilder.queryOfSelect(ast), { depth: 8 }) // dbg
    })

    /*
    fit('', () => { // fcs
      const _ = SelectAstBuilder

      const q = _
        .select('id', 'name')
        .from('users')

        // TODO:
        // - Implement whereExists
        // - Implement subqueries
        // - Implement inner join
        // - Re-consider how keywords (e.g. column names, etc.) are going to be sanitized,
        // e.g. _.select('id; delete from products where true')
        //
        .where('email', 'richard@voxgig.com')
        .where(
          _
            .where('name', 'Richard')
            .orWhere('age', '<', 30)
        )
        .limit(10)
        .offset(3)
        .build()

      console.log(QueryBuilder.queryOfSelect(q))
    })
    */

    /*
    fit('', () => { // fcs
      const where_ast = (() => {
        const lexpr = new BinaryExprNode({
          lexpr$: new ColumnNode({ name$: 'email' }),
          rexpr$: new ValueNode({ value$: 'richard@voxgig.com' }),
          op_kind$: '='
        })

        const rexpr = new UnaryExprNode({
          expr$: new ColumnNode({ name$: 'updated_at' }),
          op_kind$: 'null'
        })

        return new BinaryExprNode({
          lexpr$: lexpr,
          rexpr$: rexpr,
          op_kind$: 'and'
        })
      })()

      const ast = new SelectNode({
        columns$: [
          new ColumnNode({ name$: '*' })
        ]
      })
        .from(new TableNode({ name$: 'users' }))
        .where(where_ast)
        .limitOffset(
          new LimitOffsetNode({
            limit$: new ValueNode({ value$: 3 })
          })
          .offset(new ValueNode({ value$: 5 }))
        )
        .build()

      console.log(ast) // dbg

      const sql = SqlStringifer.stringifySelect(ast)

      console.dir(sql) // dbg
    })
    */
  })
})

