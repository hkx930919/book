---
sidebar: auto
---

# node

## 1 mongodb 下载

[下载地址](https://docs.mongodb.com/manual/installation/?_ga=2.102415241.921380577.1557825289-35976773.1557825287)

- 1 设置 path 环境变量，设置完成可以可以使用 mongo 命令

  > mongodb 安装版本为 4.0.9，安装完成后自动生成 mongo 服务

- 2 安装可视化工具 adminMongo

  ```
  1 git clone https://github.com/mrvautin/adminMongo
  2 cd adminMongo
  3 npm i
  4 npm start
  5 访问http://127.0.0.1:1234
  6 连接 mongodb://127.0.0.1:27017 数据库
  ```

## mongodb 增删改查

- 1 连接数据库

  ```js
  const { MongoClient } = require('mongodb')
  const { MONGODB_URL, DATA_BASE } = require('../setting')

  const CONNECT_OPTIONS = {
    useNewUrlParser: true
  }
  async function connectDB() {
    let client
    try {
      client = await MongoClient.connect(MONGODB_URL, CONNECT_OPTIONS)
    } catch (error) {
      console.log(error)
    }
    return client
  }
  ```

- 2 查

  - 2.1 `findOne` 方法,查询一个。返回 promise resolve(data)

    ```js
    data => { _id: '5cdbad8a0eab485de06db2da', name: '张 3', age: 19 }
    ```

    ```js
    const findOne = async (collectionName, query, options = {}) => {
      let data
      const client = await connectDB()

      if (client) {
        const dataBase = client.db(DATA_BASE)
        data = await dataBase.collection(collectionName).findOne(query, options)
        client.close()
      }
      return data
    }
    ```

    - 2.2 `find`，查询多个，调用 toArray()将数据转换成 json 数组。返回 promise resolve(data)

    ```js
    const find = async (collectionName, query, options = {}) => {
      let data
      const client = await connectDB()

      if (client) {
        const dataBase = client.db(DATA_BASE)
        data = await dataBase
          .collection(collectionName)
          .find(query, options)
          .toArray()
        client.close()
      }
      return data
    }
    ```

- 3 改 需要用到原子操作符，$set、$unset、 $push、$pushAll 等

  - 3.1 `updateOne` 方法,更改一个。返回 promise resolve(result)

    ```js
    result = {
      result: { n: 1, nModified: 1, ok: 1 },
      connection: { id: 0, host: 'localhost', port: 27017 },
      modifiedCount: 1,
      upsertedId: null,
      upsertedCount: 0,
      matchedCount: 1,
      n: 1,
      nModified: 1,
      ok: 1
    }
    ```

    ```js
    const updateOne = async (collectionName, filter, update) => {
      let response
      const client = await connectDB()

      if (client) {
        const dataBase = client.db(DATA_BASE)
        response = await dataBase
          .collection(collectionName)
          .updateOne(filter, update)
        client.close()
      }
      return response
    }
    ```

    - 3.2 `updateMany`，修改多个。返回 promise resolve(data)

    ```js
    const updateMany = async (collectionName, filter, update) => {
      let data
      const client = await connectDB()

      if (client) {
        const dataBase = client.db(DATA_BASE)
        data = await dataBase
          .collection(collectionName)
          .updateMany(filter, update)
        client.close()
      }
      return data
    }
    ```

- 4 新增

  - 4.1 `insertOne` 方法,新增一个。返回 promise resolve(result)

    ```js
    {
    result: { n: 1, ok: 1 },
    connection: { id: 0, host: 'localhost', port: 27017 },
    ops: [{ name: '张三', age: 19, _id: '5cdbb2981b756c6f0446af07' }],
    insertedCount: 1,
    insertedId: '5cdbb2981b756c6f0446af07',
    n: 1,
    ok: 1,
    }
    ```


    ```js
    const updateOne = async (collectionName, filter, update) => {
        let response
        const client = await connectDB()

        if (client) {
            const dataBase = client.db(DATA_BASE)
            response = await dataBase.collection(collectionName).updateOne(filter, update)
            client.close()
        }
        return response
    }
    ```


    - 4.2 `insertMany`，新增多个。返回 promise resolve(data)

    ```js
    const insertMany = async (collectionName, list, options = {}) => {
        let data
        const client = await connectDB()

        if (client) {
            const dataBase = client.db(DATA_BASE)
            data = await dataBase.collection(collectionName).insertMany(list, options)
            client.close()
        }
        return data
    }
    ```

- 5 删除

  - 5.1 `deleteOne` 方法,删除一个。返回 promise resolve(result)

    ```js
    result = {
      result: { n: 1, ok: 1 },
      connection: { id: 0, host: 'localhost', port: 27017 },
      deletedCount: 1,
      n: 1,
      ok: 1
    }
    ```

    ```
    const deleteOne = async (collectionName, query) => {
        let response
        const client = await connectDB()

        if (client) {
            const dataBase = client.db(DATA_BASE)
            response = await dataBase.collection(collectionName).deleteOne(query)
            client.close()
        }
        return response
    }
    ```

    - 5.2 `deleteMany`，删除多个。返回 promise resolve(data)

      ```js
      const deleteMany = async (collectionName, query) => {
        let data
        const client = await connectDB()

        if (client) {
          const dataBase = client.db(DATA_BASE)
          data = await dataBase.collection(collectionName).deleteMany(query)
          client.close()
        }
        return data
      }
      ```
# 2 JWT
##