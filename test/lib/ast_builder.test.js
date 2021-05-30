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

describe('AstBuilder', () => {
  describe('select', () => {
    fit('', () => { // fcs
      const ast = SelectNode.make({
        columns$: '*',
        from$: TableNode.make({ name$: 'users' })
      })

      console.dir(ast, { depth: 8 }) // dbg

      console.log(QueryBuilder.queryOfSelect(ast)) // dbg
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

