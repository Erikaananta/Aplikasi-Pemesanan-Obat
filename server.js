const express = require('express')
const bodyParser = require ('body-parser')
const mysql = require ('mysql')
const jwt = require ('jsonwebtoken')

const app = express()

const secretKey = 'thisisverysecretKey'

app.use (bodyParser.json())
app.use (bodyParser.urlencoded({
    extended: true
}))

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'apotek_online'
})

db.connect((err) =>{
    if(err) throw err
    console.log ('Database conneccted..')
})

const isAuthorized = (request, result, next) => {
    if (typeof(request.headers['x-api-key']) == 'undefined') {
        return result.status(403).json({
            success: false,
            message: 'Unauthorized. Token is not provided'
        })
    }

    let token = request.headers['x-api-key']

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return result.status(401).json({
                success: false,
                message: 'Unauthorized. Token is invalid'
            })
        }
    })


    next()
}

app.get('/', (request, result) => {
    result.json({
        success: true,
        message: 'Welcome'
    })
})

app.post('/login', (request, result) => {
    let data = request.body

    if (data.username == 'admin' && data.password == 'admin') {
        let token = jwt.sign(data.username + '|' + data.password, secretKey)

        result.json({
            success: true,
            message: 'Login success, welcome back Admin!',
            token: token
        })
    }

    result.json({
        success: false,
        message: 'You are not person with username admin and have password admin!'
    })
})


app.get('/obat', (req, res) =>{
    let sql = `
        select * from obat
    `

    db.query(sql, (err, result) => {
        if(err) throw err
        res.json({
            success: true,
            message: 'Success retrive data from database',
            data: result
        })
    })
})

app.post('/obat', isAuthorized, (request, result) => { 
    let data = request.body

    let sql = `
        insert into obat (nama, jenis, stock, harga)
        values ('`+data.nama+`', '`+data.jenis+`', '`+data.stock+`', '`+data.harga+`');
    `

    db.query(sql, (err, result) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Your new medicine is ready'
    })
})

app.put('/obat/:id', isAuthorized, (request, result) => {
    let data = request.body

    let sql = `
        update obat
        set nama = '`+data.nama+`', jenis = '`+data.jenis+`', stock = '`+data.stock+`', harga = '`+data.harga+`'
        where id = `+request.params.id+`
    `

    db.query(sql, (err, result) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Data medicine has been updated'
    })
})

app.delete('/obat/:id', isAuthorized, (request, result) => {
    let sql = `
        delete from obat where id = `+request.params.id+`
    `

    db.query(sql, (err, res) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Data medicine has been deleted'
    })
})

//user
app.get('/users', isAuthorized,(req, res)=>{
    let sql = `
        select id, username, created_at from users
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "success get all user",
            data: result
        })
    })
})

app.post('/users', isAuthorized, (req, res)=>{
    let data = req.body

    let sql = `
        insert into users (username, password)
        values ('`+data.username+`', '`+data.password+`')
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "user created",
            data: result
        })
    })
})

app.get('/users/:id', isAuthorized, (req, res) => {
    let sql = `
        select * from users
        where id = `+req.params.id+`
        limit 1
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "success get all user",
            data: result
        })
    })
})

app.put('/users/:id', isAuthorized, (req, res)=>{
    let data = req.body

    let sql = `
    update users set
    username = '`+data.username+`', password = '`+data.password+`'
    where id = '`+req.params.id+`'
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "data has been updated",
            data: result
        })
    })
})

app.delete('/users/:id', isAuthorized, (req, res)=>{
    let sql = `
    delete from users
    where id = '`+req.params.id+`'
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "data has been deleted",
            data: result
        })
    })
})

//TRANSAKSI

app.post('/obat/:id/take', isAuthorized, (req, res) => {
    let data = req.body

    db.query(`

        insert into transaksi (user_id, obat_id, jumlah)
        values ('`+data.user_id+`', '`+req.params.id+`', '`+data.jumlah+`')
    `, (err, result) => {
        if (err) throw err
    })

    db.query(`
        update obat
        set stock = stock - 1
        where id = '`+req.params.id+`'
    `, (err, result) => {
        if (err) throw err
    })

    res.json({
        message: "Medicine has been taked by user"
    })
})

app.get('/users/:id/obat', isAuthorized, (req, res) => {
    db.query(`
        select obat.nama, obat.jenis, obat.stock, obat.harga
        from users
        right join transaksi on users.id = transaksi.user_id
        right join obat on transaksi.obat_id = obat.id
        where users.id = '`+req.params.id+`'
    `, (err, result) => {
        if (err) throw err

        res.json({
            message: "success get user's medicine",
            data: result
        })
    })
})

app.put('/transaksi/:id', isAuthorized, (req, res) => {  
    let data = req.body

    let sql = `
        update transaksi
        set user_id = '`+data.user_id+`', obat_id= '`+data.obat_id+`'
        where id = '`+req.params.id+`'
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "data has been updated",
            data: result
        })
    })
})

app.delete('/transaksi/:id', isAuthorized, (req, res) => {
    let sql = `
        delete from transaksi
        where id = '`+req.params.id+`'
    `

    db.query(sql, (err, result) => {
        if (err) throw err
        
        res.json({
            message: "data has been deleted",
            data: result
        })
    })
})

// metode
app.post('/obat/:id/buy', (req, res) =>{
    let request = req.body
    db.query(`
        select* from obat where id =?
    `, [req.params.id], (error, result) => {
        if(error) throw error

        if(result.length <= 0){
            res.json({
                success: false,
                message: 'There is no roduct with id' + req.params.id
            })
        } else {
            let data = result [0]

            res.json({
                success: true,
                message: 'You are about to buy' + data.nama + 'and will be delivered to' + request.username + 
                '. You will be charged Rp. ' + (request.jumlah * data.harga) + '. Please choose your payment method.',
                data: {
                    transaction_code: 'ORD',
                    shipping_data: request,
                   payment_methods: [{
                       code: '001',
                       name: 'BRI Virtual Account'
                    },
                    { 
                        code: '002',
                        name: 'BCA Virtual Account'
                    }]  
                }
            })
        }
    })
})

app.post('/checkout', (req, res)=>{
    res.json({
        success: true,
        message: 'Your order has been recorded.',
        data: req.body
    })
})

app.listen(3000, () => {
    console.log('App is running on port 3000')
})  