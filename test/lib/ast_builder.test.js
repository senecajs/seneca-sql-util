const Assert = require('assert-plus')
const QueryBuilder = require('../../lib/query_builder') // dbg

class AstBuilder {
  static select(...args) {
    return SelectAstBuilder.select(...args)
  }

  static where(...args) {
    return WhereAstBuilder.where(...args)
  }
}

class SelectAstBuilder {
  constructor(args) {
    this.sel_node$ = args.sel_node$
    this.where_builder$ = args.where_builder$ || null
  }

  static select(...column_names) {
    const col_nodes = column_names.map(name => new ColumnNode({ name$: name }))
    const sel_node = new SelectNode({ columns$: col_nodes })

    return new SelectAstBuilder({
      sel_node$: sel_node,
      where_builder$: this.where_builder$
    })
  }

  from(table_name) {
    const table_node = new TableNode({ name$: table_name })
    const sel_node = this.sel_node$.from(table_node)

    return new SelectAstBuilder({
      sel_node$: sel_node,
      where_builder$: this.where_builder$
    })
  }

  where(...args) {
    const where_builder = (() => {
      if (null == this.where_builder$) {
        return WhereAstBuilder.where(...args)
      }

      return this.where_builder$.where(...args)
    })()

    return new SelectAstBuilder({
      sel_node$: this.sel_node$,
      where_builder$: where_builder
    })
  }

  whereExists(...args) {
    const where_builder = (() => {
      if (null == this.where_builder$) {
        return WhereAstBuilder.whereExists(...args)
      }

      return this.where_builder$.whereExists(...args)
    })()

    return new SelectAstBuilder({
      sel_node$: this.sel_node$,
      where_builder$: where_builder
    })
  }

  orWhere(...args) {
    return new SelectAstBuilder({
      sel_node$: this.sel_node$,
      where_builder$: this.where_builder$.orWhere(...args)
    })
  }

  limit(n) {
    const sel_node = this.sel_node$.limit(n)

    return new SelectAstBuilder({
      sel_node$: sel_node,
      where_builder$: this.where_builder$
    })
  }

  offset(n) {
    const sel_node = this.sel_node$.offset(n)

    return new SelectAstBuilder({
      sel_node$: sel_node,
      where_builder$: this.where_builder$
    })
  }

  build() {
    let builder = this.sel_node$

    if (null != this.where_builder$) {
      builder = builder.where(this.where_builder$)
    }

    return builder.build()
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

  andWhere(node) {
    const where_node = (() => {
      if (null == this.where$) {
        return node
      }

      return new BinaryExprNode({
        lexpr$: this.where$,
        rexpr$: node,
        op_kind$: 'and'
      })
    })()

    return this.where(where_node)
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

class WhereAstBuilder {
  constructor(node) {
    this.root$ = node
  }

  static _exprOfUserFriendlyArgs(...args) {
    if (args.length === 1 && args[0] instanceof WhereAstBuilder) {
      return args[0].root$
    }

    const [column_name, op_kind, value] = (() => {
      if (args.length === 3) {
        return args
      }

      if (args.length === 2) {
        const [column_name, value] = args
        return [column_name, '=', value]
      }

      Assert.fail(`Did not expect ${args.length} args`)
    })()

    return new BinaryExprNode({
      lexpr$: new ColumnNode({ name$: column_name }),
      rexpr$: new ValueNode({ value$: value }),
      op_kind$: op_kind
    })
  }

  _and(node) {
    const where_node = new BinaryExprNode({
      lexpr$: this.root$,
      rexpr$: node,
      op_kind$: 'and'
    })

    return new WhereAstBuilder(where_node)
  }

  _or(node) {
    const where_node = new BinaryExprNode({
      lexpr$: this.root$,
      rexpr$: node,
      op_kind$: 'or'
    })

    return new WhereAstBuilder(where_node)
  }

  whereExists(builder) {
    Assert(builder instanceof SelectAstBuilder, 'builder')

    return this._and(builder)
  }

  static whereExists(builder) {
    Assert(builder instanceof SelectAstBuilder, 'builder')

    return new WhereAstBuilder(builder)
  }

  static where(...args) {
    const expr_node = WhereAstBuilder._exprOfUserFriendlyArgs(...args)
    return new WhereAstBuilder(expr_node)
  }

  where(...args) {
    const expr_node = WhereAstBuilder._exprOfUserFriendlyArgs(...args)
    return this._and(expr_node)
  }

  whereNull(column_name) {
    const expr_node = new UnaryExprNode({
      expr$: new ColumnNode({ name$: column_name }),
      op_kind$: 'null'
    })

    return this._and(expr_node)
  }

  orWhereNull(column_name) {
    const expr_node = new UnaryExprNode({
      expr$: new ColumnNode({ name$: column_name }),
      op_kind$: 'null'
    })

    return this._or(expr_node)
  }

  orWhere(...args) {
    const expr_node = WhereAstBuilder._exprOfUserFriendlyArgs(...args)
    return this._or(expr_node)
  }

  build() {
    return this.root$.build()
  }
}

describe('AstBuilder', () => {
  describe('select', () => {
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
        .whereExists(
          _.select('id').from('users')
            .where('age', '>', 17)
            .where('points', '>', 0)
        )
        .where('email', 'richard@voxgig.com')
        .limit(10)
        .offset(3)
        .build()

      console.dir(q, { depth: 8 }) // dbg

      console.log(QueryBuilder.queryOfSelect(q))
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

