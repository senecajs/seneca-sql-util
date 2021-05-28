const Assert = require('assert-plus')
const SqlStringifer = require('../../lib/sql_stringifier') // dbg

class SelectQueryBuilder {
  constructor(sel_node) {
    this.root$ = sel_node
  }

  static select(...column_names) {
    const col_nodes = column_names.map(name => new ColumnNode({ name$: name }))
    const sel_node = new SelectNode({ columns$: col_nodes })

    return new SelectQueryBuilder(sel_node)
  }

  from(table_name) {
    const table_node = new TableNode({ name$: table_name })
    const sel_node = this.root$.from(table_node)

    return new SelectQueryBuilder(sel_node)
  }

  where(column_name, op, value) {
  }

  limit(n) {
    const sel_node = this.root$.limit(n)
    return new SelectQueryBuilder(sel_node)
  }

  offset(n) {
    const sel_node = this.root$.offset(n)
    return new SelectQueryBuilder(sel_node)
  }

  toSql() {
    const ast = this.root$.build()
    return SqlStringifer.stringifySelect(ast)
  }
}

class SelectNode {
  constructor(args) {
    this.columns$ = args.columns$
    this.from$ = args.from$ || null
    this.where$ = args.where$ || null
    this.limit_offset$ = args.limit_offset$ || null
  }

  from(node) {
    return new SelectNode({
      columns$: this.columns$,
      from$: node,
      where$: this.where$,
      limit_offset$: this.limit_offset$
    })
  }

  where(node) {
    return new SelectNode({
      columns$: this.columns$,
      from$: this.from$,
      where$: node,
      limit_offset$: this.limit_offset$
    })
  }

  limitOffset(node) {
    return new SelectNode({
      columns$: this.columns$,
      from$: this.from$,
      where$: this.where$,
      limit_offset$: node
    })
  }

  limit(n) {
    return new SelectNode({
      columns$: this.columns$,
      from$: this.from$,
      where$: this.where$,
      limit_offset$: new LimitOffsetNode({
        limit$: new ValueNode({ value$: n })
      })
    })
  }

  offset(n) {
    const node = (() => {
      const offset_node = new ValueNode({ value$: n })

      if (null == this.limit_offset$) {
        const max_limit = 2 ** 30 + (2 ** 30 - 1)

        return new LimitOffsetNode({
          limit$: new ValueNode({ value$: max_limit }),
          offset$: offset_node
        })
      }

      return this.limit_offset$.offset(offset_node)
    })()

    return new SelectNode({
      columns$: this.columns$,
      from$: this.from$,
      where$: this.where$,
      limit_offset$: node
    })
  }

  build() {
    const ast = { whatami$: 'select_t' }

    ast.columns$ = this.columns$.map(column_node => column_node.build())

    if (null != this.where$) {
      ast.where$ = this.where$.build()
    }
    
    if (null != this.from$) {
      ast.from$ = this.from$.build()
    }

    if (null != this.limit_offset$) {
      ast.limit$ = this.limit_offset$.build()
    }

    return ast
  }
}

class TableNode {
  constructor(args) {
    this.name$ = args.name$
  }

  build() {
    return { whatami$: 'table_t', name$: this.name$ }
  }
}

class ValueNode {
  constructor(args) {
    this.value$ = args.value$
  }

  build() {
    return { whatami$: 'value_t', value$: this.value$ }
  }
}

class LimitOffsetNode {
  constructor(args) {
    this.limit$ = args.limit$
    this.offset$ = args.offset$ || null
  }

  offset(node) {
    return new LimitOffsetNode({
      limit$: this.limit$,
      offset$: node
    })
  }

  build() {
    const ast = { whatami$: 'limit_t' }

    ast.limit$ = this.limit$.build()

    if (null != this.offset$) {
      ast.offset$ = this.offset$.build()
    }

    return ast
  }
}

class ColumnNode {
  constructor(args) {
    this.name$ = args.name$
  }

  build() {
    return { whatami$: 'column_t', name$: this.name$ }
  }
}

class BinaryExprNode {
  constructor(args) {
    this.lexpr$ = args.lexpr$
    this.rexpr$ = args.rexpr$
    this.op_kind$ = args.op_kind$
  }

  build() {
    const ast = { whatami$: 'binary_expr_t' }

    ast.lexpr$ = this.lexpr$.build()
    ast.rexpr$ = this.rexpr$.build()
    ast.op_kind$ = this.op_kind$

    return ast
  }
}

class UnaryExprNode {
  constructor(args) {
    this.expr$ = args.expr$
    this.op_kind$ = args.op_kind$
  }

  build() {
    const ast = { whatami$: 'unary_expr_t' }

    ast.expr$ = this.expr$.build()
    ast.op_kind$ = this.op_kind$

    return ast
  }
}

describe('AstBuilder', () => {
  describe('select', () => {
    fit('', () => { // fcs
      const q = SelectQueryBuilder
        .select('id', 'name')
        .from('users')
        .limit(10)
        .offset(3)

      console.log(q.toSql())
    })

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

