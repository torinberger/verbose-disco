
const axios = require('axios')
const Router = require('koa-router')

const serverPrivate = require('../../private.json')

module.exports = (database) => {
  const market = new Router()

  market.get('/get/stock/:stock', async (ctx) => {
    let stockSymbol = ctx.params.stock

    await database
      .stock()
      .getStock({
        symbol: stockSymbol
      })
      .then(async (stock) => {
        if (stock.length === 0) {
          ctx.status = 404
          ctx.body = 'Stock Not Found!'
        } else {
          let stockData = stock[0]
          ctx.status = 200
          ctx.body = stockData
        }
      })
      .catch((err) => {
        ctx.status = 500
        ctx.body = err
      })
  })

  market.get('/get/stockHistory/:stock', async (ctx) => {
    let stockSymbol = ctx.params.stock

    await axios
      .get(`https://www.quandl.com/api/v3/datasets/WIKI/${stockSymbol}/data.json?api_key=${serverPrivate.api.key}&collapse=quarterly&start_date=2000-01-01`)
      .then(function (response) {
        let history = response.data

        ctx.status = 200
        ctx.body = history
      })
      .catch(function (err) {
        console.log(err)
        ctx.status = 404
        ctx.body = 'Stock Not Found!'
      })
  })

  market.get('/get/stocks', async (ctx) => {
    await database
      .stock()
      .getStocks()
      .then((stocks) => {
        ctx.status = 200
        ctx.body = stocks
      })
      .catch((err) => {
        console.log(err)
        ctx.status = 500
        ctx.body = err
      })
  })

  market.get('/get/holdings/:user', async (ctx) => {
    let userID = ctx.params.stock

    await database
      .holding()
      .getHolding({ user: userID })
      .then((holdings) => {
        ctx.status = 200
        ctx.body = holdings
      })
  })

  market.post('/buy/stock/:stock', async (ctx) => {
    let postData = ctx.request.body
    let { holding } = postData // { amount, stockID }
    let { user } = postData // user ID
    let stockSymbol = ctx.params.stock
    console.log(stockSymbol)

    await axios
      .get(`https://www.quandl.com/api/v3/datasets/WIKI/${stockSymbol}/data.json?api_key=${serverPrivate.api.key}&collapse=quarterly&start_date=2000-01-01`)
      .then(async function (response) {
        let stockPrice = response.data.dataset_data.data[0][11]

        console.log('stock price ', stockPrice)

        await database
          .user()
          .getUser({_id: user})
          .then(async (targetUser) => {
            targetUser = targetUser[0]

            console.log()

            if(targetUser !== undefined) {
              let price = stockPrice * holding.amount

              if(targetUser.balance >= price) {
                await database
                  .transaction()
                  .addTransaction({
                    user,
                    stock: holding.stockID,
                    price: stockPrice,
                    date: new Date().getTime(),
                    type: 'buy',
                    amount: holding.amount
                  })
                  .then(async (addedTransaction) => {
                    console.log(addedTransaction)
                  })
                await database
                  .user()
                  .updateUser(user, { $inc: { 'balance': -price } })
                  .then((updatedUser) => {
                    console.log('Decreased user\'s balance by ', price)
                  })
                await database
                  .holding()
                  .updateOrAddHolding(user, holding.stockID, { $inc: { 'amount': holding.amount } })
                  .then((updatedHolding) => {
                    ctx.body = 'wonky'
                  })
              } else {
                ctx.status = 401
                ctx.body = 'Not Enough Money in Balance!'
              }

            } else {
              ctx.status = 404
              ctx.body = 'User Not Found!'
            }
          })
      })
      .catch(function (err) {
        console.log(err)
        ctx.status = 404
        ctx.body = 'Stock Not Found!'
      })
  })

  return (market)
}
