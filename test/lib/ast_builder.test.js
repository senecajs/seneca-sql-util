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

    return { whatami$: 'select_t', columns$, from$ }
  }
}

class TableNode {
  static make(data) {
    Assert.object(data, 'data')

    const name$ = fetchProp(data, 'name$')

    return { whatami$: 'table_t', name$ }
  }
}

class ColumnNode {
  static make(data) {
    Assert.object(data, 'data')

    const name$ = fetchProp(data, 'name$')

    return { whatami$: 'column_t', name$ }
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
  constructor(args = {}) {
    this._root = args.root || null
  }

  toAst() {
    return this._root
  }

  select(...args) {
    Assert(args.length > 0, 'select args cannot be empty')

    const columns = args.map(arg => {
      if (typeof arg === 'string') {
        return ColumnNode.make({ name$: arg })
      }

      if (arg && arg.whatami$ === 'raw_sql_t') {
        return arg
      }

      throw new Error('Unexpected type of the column argument')
    })

    const root = SelectNode.make({ columns$: columns })

    return new AstBuilder({ root })
  }

  from(what) {
    if (typeof what === 'string') {
      const table_node = TableNode.make({ name$: what })

      const root = SelectNode.make({
        ...this._root,
        from$: table_node
      })

      return new AstBuilder({ root })
    }

    if (what && what.whatami$ === 'select_t') {
      const root = SelectNode.make({
        ...this._root,
        from$: what
      })

      return new AstBuilder({ root })
    }

    throw new Error('Unexpected type of the argument')
  }

  raw(sql, values) {
    const root = RawSqlNode.make({ raw_sql$: sql, raw_values$: values })

    return new AstBuilder({ root })
  }
}

describe('query-building', () => {
  describe('select', () => {
    fit('', () => { // fcs
      /*
      const ast = SelectNode.make({
        columns$: '*',
        from$: SelectNode.make({
          columns$: [
            ColumnNode.make({ name$: 'id' }),
            ColumnNode.make({ name$: 'first_name' })
          ],
          from$: TableNode.make({ name$: 'users' })
        })
      })
      */

      const ast = new AstBuilder()
        .select(
          '*',
          new AstBuilder()
            .raw('age >= ? as is_mature', [18])
            .toAst()
        )
        .from(
          new AstBuilder()
            .select('id', 'age')
            .from('users')
            .toAst()
        )
        .toAst()

      console.dir(ast, { depth: 8 }) // dbg

      console.dir(QueryBuilder.queryOfSelect(ast), { depth: 8 }) // dbg
    })

    /*
    fit('', () => { // fcs
      const _ = AstBuilder

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

