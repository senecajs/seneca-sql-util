const SqlStringifer = require('../../lib/sql_stringifier')

describe('SqlStringifer', () => {
  describe('stringifyInsert', () => {
    describe("insert into products (\"id\") values ('aaaa')", () => {
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
        expect(sql).toEqual("insert into products (\"id\") values ('aaaa')")
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

    describe("insert into products (\"est_price\", \"price\", \"version\") values (3.95, '3.95', 0)", () => {
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
        expect(sql).toEqual("insert into products (\"est_price\", \"price\", \"version\") values (3.95, '3.95', 0)")
      })
    })
  })
})
