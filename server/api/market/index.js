
const axios = require('axios')
const Router = require('koa-router')

const serverPrivate = require('../../private.json')

function obj2Arr (obj, addTitle) {
  let arr = []

  let i = 0
  for (let elem in obj) {
    arr.push(obj[elem])
    if (addTitle) { arr[i]['0. date'] = elem }

    i++
  }
  return arr
}

var inc = 0
function getKey() {
  inc = inc+1 > require('../../private').api.keys.length ? 0 : inc+1
  console.log(require('../../private').api.keys[inc])
  return require('../../private').api.keys[inc]
}

// async function getUserValue (database, user) {
//   let bal = user.balance
//
//   await database
//     .holdings
//     .then(function () {
//
//     })
// }

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

  market.get('/get/stockHistory/:stock/:time', async (ctx) => {
    let stockSymbol = ctx.params.stock
    let timeInterval = ctx.params.time

    await axios
      .get(`https://www.alphavantage.co/query?function=TIME_SERIES_${timeInterval == 'INTRADAY' ? timeInterval : timeInterval + '_ADJUSTED'}&symbol=${stockSymbol}&apikey=${getKey()}&interval=60min`)
      .then(async (response) => {
        let history = response.data
        console.log(response.data.note ? response.data.note : 'Requested Stock!')
        let data = obj2Arr(obj2Arr(history)[1], true).reverse()

        ctx.status = 200
        ctx.body = data
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
    let userID = ctx.params.user

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
      .get(`https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&apikey=${getKey()}&interval=60min`)
      .then(async (response) => {
        let history = response.data
        console.log(response.data.note ? response.data.note : 'Requested Stock!')
        let stockPrice = obj2Arr(obj2Arr(history)[1], true)[0]['4. close']

        console.log('stock price ', stockPrice)

        await database
          .user()
          .getUser({_id: user})
          .then(async (targetUser) => {
            targetUser = targetUser[0]

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
                ctx.status = 400
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

  market.post('/sell/stock/:stock', async (ctx) => {
    let postData = ctx.request.body
    let { holding } = postData // { amount, stockID }
    let { user } = postData // user ID
    let stockSymbol = ctx.params.stock
    console.log(stockSymbol)
    console.log('amount to sell', holding.amount)

    await axios
      .get(`https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&apikey=${getKey()}&interval=60min`)
      .then(async (response) => {
        let history = response.data
        console.log(response.data.note ? response.data.note : 'Requested Stock!')
        let stockPrice = obj2Arr(obj2Arr(history)[1], true)[0]['4. close']

        console.log('stock price ', stockPrice)

        await database
          .user()
          .getUser({ _id: user })
          .then(async (targetUser) => {
            targetUser = targetUser[0]

            if(targetUser !== undefined) {

              await database
                .holding()
                .getHolding({ user: user })
                .then(async (holdings) => {

                  for (var i = 0; i < holdings.length; i++) {
                    if (holdings[i].user == user && holdings[i].amount > 0) {
                      console.log('user currently owns', holdings[i].amount)
                      console.log('selling', (holding.amount <= holdings[i].amount ? holding.amount : holdings[i].amount), 'shares')

                      let amountToSell = (holding.amount <= holdings[i].amount ? holding.amount : holdings[i].amount) // gets lower value, owned amount, or requested sell amount
                      let price = stockPrice * amountToSell

                      await database
                        .transaction()
                        .addTransaction({
                          user,
                          stock: holding.stockID,
                          price: stockPrice,
                          date: new Date().getTime(),
                          type: 'sell',
                          amount: amountToSell
                        })
                        .then(async (addedTransaction) => {
                          console.log(addedTransaction)
                        })
                      await database
                        .user()
                        .updateUser(user, { $inc: { 'balance': price } })
                        .then((updatedUser) => {
                          console.log('Increased user\'s balance by ', price)
                        })
                      await database
                        .holding()
                        .updateOrAddHolding(user, holding.stockID, { $inc: { 'amount': -amountToSell } })
                        .then((updatedHolding) => {
                          ctx.body = 'wonky'
                        })
                      return
                    }
                  }

                  ctx.status = 400
                  ctx.body = 'Not Enough Shares in Stock!'

                })

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
