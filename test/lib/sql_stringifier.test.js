const SqlStringifer = require('../../lib/sql_stringifier')

describe('SqlStringifer', () => {
  describe('stringifyInsert', () => {
    describe("insert into products (id) values ('aaaa')", () => {
      const insert_ast = {
        whatami$: 'insert_t',
        into$: { whatami$: 'table_t', name$: 'products' },
        column_names$: ['id'],
        what$: {
          whatami$: 'insert_values_t',
          values$: [
            { whatami$: 'value_t', value$: 'aaaa' }
          ]
        }
      }

      it('builds correct SQL', () => {
        const sql = SqlStringifer.stringifyInsert(insert_ast)
        expect(sql).toEqual("insert into products (id) values ('aaaa')")
      })
    })

    describe("insert into products values ('aaaa')", () => {
      const insert_ast = {
        whatami$: 'insert_t',
        into$: { whatami$: 'table_t', name$: 'products' },
        what$: {
          whatami$: 'insert_values_t',
          values$: [
            { whatami$: 'value_t', value$: 'aaaa' }
          ]
        }
      }

      it('builds correct SQL', () => {
        const sql = SqlStringifer.stringifyInsert(insert_ast)
        expect(sql).toEqual("insert into products values ('aaaa')")
      })
    })

    describe("insert into products (est_price, price, version) values (3.95, '3.95', 0)", () => {
      const insert_ast = {
        whatami$: 'insert_t',
        into$: { whatami$: 'table_t', name$: 'products' },
        column_names$: ['est_price', 'price', 'version'],
        what$: {
          whatami$: 'insert_values_t',
          values$: [
            { whatami$: 'value_t', value$: 3.95 },
            { whatami$: 'value_t', value$: '3.95' },
            { whatami$: 'value_t', value$: 0 }
          ]
        }
      }

      it('builds correct SQL', () => {
        const sql = SqlStringifer.stringifyInsert(insert_ast)
        expect(sql).toEqual("insert into products (est_price, price, version) values (3.95, '3.95', 0)")
      })
    })

    describe("insert into products (id) values ('aaaa') on conflict (id) do update set price = '1.95'", () => {
      const insert_ast = {
        whatami$: 'insert_t',
        into$: { whatami$: 'table_t', name$: 'products' },
        column_names$: ['id'],
        what$: {
          whatami$: 'insert_values_t',
          values$: [
            { whatami$: 'value_t', value$: 'aaaa' }
          ],
          upsert$: {
            whatami$: 'upsert_t',
            on_conflict_with$: [
              { whatami$: 'column_t', name$: 'id' }
            ],
            do_what$: {
              whatami$: 'upsert_update_t',
              set$: [
                [
                  { whatami$: 'column_t', name$: 'price' },
                  { whatami$: 'value_t', value$: '1.95' }
                ]
              ]
            }
          }
        }
      }

      it('builds correct SQL', () => {
        const sql = SqlStringifer.stringifyInsert(insert_ast)

        expect(sql).toEqual(
          "insert into products (id) values ('aaaa') on conflict (id) do update set price = '1.95'"
        )
      })
    })

    // TODO:
    //
    xdescribe("insert into products (id) values ('aaaa') on conflict (id) do update set version = version + 1", () => {
    })
  })

  describe('stringifySelect', () => {
    describe("select * from users", () => {
      const select_ast = {
        whatami$: 'select_t',
        columns$: '*',
        from$: { whatami$: 'table_t', name$: 'users' }
      }

      it('builds correct SQL', () => {
        const sql = SqlStringifer.stringifySelect(select_ast)
        expect(sql).toEqual('select * from users')
      })
    })

    describe("select * from users as u", () => {
      const select_ast = {
        whatami$: 'select_t',
        columns$: '*',
        from$: { whatami$: 'table_t', name$: 'users', alias$: 'u' }
      }

      it('builds correct SQL', () => {
        const sql = SqlStringifer.stringifySelect(select_ast)
        expect(sql).toEqual('select * from users as u')
      })
    })

    describe("select id, email from users", () => {
      const select_ast = {
        whatami$: 'select_t',
        columns$: [
          { whatami$: 'column_t', name$: 'id' },
          { whatami$: 'column_t', name$: 'email' }
        ],
        from$: { whatami$: 'table_t', name$: 'users' }
      }

      it('builds correct SQL', () => {
        const sql = SqlStringifer.stringifySelect(select_ast)
        expect(sql).toEqual('select id, email from users')
      })
    })

    describe("select u.id, u.email from users as u", () => {
      const select_ast = {
        whatami$: 'select_t',
        columns$: [
          { whatami$: 'column_t', name$: 'id' },
          { whatami$: 'column_t', name$: 'email' }
        ],
        from$: { whatami$: 'table_t', name$: 'users', alias$: 'u' }
      }

      it('builds correct SQL', () => {
        const sql = SqlStringifer.stringifySelect(select_ast)
        expect(sql).toEqual('select id, email from users as u')
      })
    })

    describe("select id, 1 as one from users as u", () => {
      const select_ast = {
        whatami$: 'select_t',
        columns$: [
          { whatami$: 'column_t', name$: 'id' },
          { whatami$: 'value_t', value$: 1, alias$: 'one' }
        ],
        from$: { whatami$: 'table_t', name$: 'users', alias$: 'u' }
      }

      it('builds correct SQL', () => {
        const sql = SqlStringifer.stringifySelect(select_ast)
        expect(sql).toEqual("select id, 1 as one from users as u")
      })
    })

    describe("select id from users limit 5", () => {
      const select_ast = {
        whatami$: 'select_t',
        columns$: [
          { whatami$: 'column_t', name$: 'id' }
        ],
        from$: { whatami$: 'table_t', name$: 'users' },
        limit$: {
          whatami$: 'limit_t',
          limit$: { whatami$: 'value_t', value$: 5 },
        }
      }

      it('builds correct SQL', () => {
        const sql = SqlStringifer.stringifySelect(select_ast)
        expect(sql).toEqual("select id from users limit 5")
      })
    })

    describe("select id from users limit 5 offset 3", () => {
      const select_ast = {
        whatami$: 'select_t',
        columns$: [
          { whatami$: 'column_t', name$: 'id' }
        ],
        from$: { whatami$: 'table_t', name$: 'users' },
        limit$: {
          whatami$: 'limit_t',
          limit$: { whatami$: 'value_t', value$: 5 },
          offset$: { whatami$: 'value_t', value$: 3 }
        }
      }

      it('builds correct SQL', () => {
        const sql = SqlStringifer.stringifySelect(select_ast)
        expect(sql).toEqual("select id from users limit 5 offset 3")
      })
    })

    describe('select id from users order by "email" asc, "age" desc', () => {
      const select_ast = {
        whatami$: 'select_t',
        columns$: [
          { whatami$: 'column_t', name$: 'id' }
        ],
        from$: { whatami$: 'table_t', name$: 'users' },
        order_by$: {
          whatami$: 'order_by_t',
          terms$: [
            {
              whatami$: 'ordering_term_t',
              column$: { whatami$: 'column_t', name$: 'email' },
              order$: 'asc'
            },
            {
              whatami$: 'ordering_term_t',
              column$: { whatami$: 'column_t', name$: 'age' },
              order$: 'desc'
            }
          ]
        }
      }

      it('builds correct SQL', () => {
        const sql = SqlStringifer.stringifySelect(select_ast)
        expect(sql).toEqual("select id from users order by email asc, age desc")
      })
    })

    describe('select id from users order by email asc, age desc limit 3 offset 5', () => {
      const select_ast = {
        whatami$: 'select_t',
        columns$: [
          { whatami$: 'column_t', name$: 'id' }
        ],
        from$: { whatami$: 'table_t', name$: 'users' },
        order_by$: {
          whatami$: 'order_by_t',
          terms$: [
            {
              whatami$: 'ordering_term_t',
              column$: { whatami$: 'column_t', name$: 'email' },
              order$: 'asc'
            },
            {
              whatami$: 'ordering_term_t',
              column$: { whatami$: 'column_t', name$: 'age' },
              order$: 'desc'
            }
          ]
        },
        limit$: {
          whatami$: 'limit_t',
          limit$: { whatami$: 'value_t', value$: 5 },
          offset$: { whatami$: 'value_t', value$: 3 }
        }
      }

      it('builds correct SQL', () => {
        const sql = SqlStringifer.stringifySelect(select_ast)
        expect(sql).toEqual("select id from users order by email asc, age desc limit 5 offset 3")
      })
    })
  })
})

