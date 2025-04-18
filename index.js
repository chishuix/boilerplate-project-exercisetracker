const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require("mongoose")
const bodyParser = require("body-parser");

app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.use(bodyParser.urlencoded({extended: false}));

// 连接 MongoDB
let mongdbUri = process.env.MONGO_URI;
mongoose.connect(mongdbUri).then(async () => {
  console.log("数据库连接成功")
  await User.deleteMany({});
  await Exercise.deleteMany({});
}).catch(err => {
  console.error("数据库连接失败：", err);
});

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: String
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new Schema({
  userId: String,
  description: String,
  duration: Number,
  date: String,
  username: String
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

/*
您的回复应该具有以下结构。

Exercise:  练习：

{
  username: "fcc_test",
  description: "test",
  duration: 60,
  date: "Mon Jan 01 1990",
  _id: "5fb5853f734231456ccb3b05"
}
User:  用户：

{
  username: "fcc_test",
  _id: "5fb5853f734231456ccb3b05"
}
Log:  日志：

{
  username: "fcc_test",
  count: 1,
  _id: "5fb5853f734231456ccb3b05",
  log: [{
    description: "test",
    duration: 60,
    date: "Mon Jan 01 1990",
  }]
}
Hint: For the date property, the toDateString method of the Date API can be used to achieve the expected output.
提示：对于 date 属性，可以使用 Date API 的 toDateString 方法来达到预期的输出。
*/

/*
2. 您可以使用表单数据 POST 到 /api/users 来创建一个新用户。
3. 从 POST /api/users 返回的响应，使用表单数据 username 将是一个具有 username 和 _id 属性的对象。
4. 您可以向 /api/users 发送 GET 请求以获取所有用户的列表。
5. GET 请求 /api/users 返回一个数组。
6. 从 GET /api/users 返回的数组中的每个元素都是一个包含用户 username 和 _id 的对象字面量。
*/
app.route("/api/users").post((req, res) => {
  let newUser = new User({
    username: req.body.username
  });

  newUser.save().then((data) => {
    res.json(data);
  }).catch(err => {
    console.error("存储错误1：", err);
  });
}).get((req, res) => {
  User.find().select("username _id").then(result => {
    res.send(result);
  }).catch(err => {
    console.error("查找失败：", err);
  });
});

/*
7. 您可以使用 POST 向 /api/users/:_id/exercises 发送带有 description 、 duration 和可选的 date 的表单数据。如果没有提供日期，将使用当前日期。
8. 从 POST /api/users/:_id/exercises 返回的响应将是添加了锻炼字段的用户对象。
*/
app.post("/api/users/:_id/exercises", (req, res) => {
  (async () => {
    // 查找用户
    let userId = req.params._id;
    let user = await User.findById(userId).exec();

    if (!req.body.date) {
      req.body.date = new Date().toISOString().split('T')[0];
    }

    const newExercise = new Exercise({
      userId: userId,
      description: req.body.description,
      duration: req.body.duration,
      date: req.body.date
    });

    newExercise.save().then((result) => {
      result = result.toObject();
      result._id = userId;
      result.username = user.username;
      result.date = new Date(result.date).toDateString();
      res.json(result);
    }).catch(err => {
      console.error("存储错误2：", err);
    });
  })();
});

/*
9. 您可以发送 GET 请求到 /api/users/:_id/logs 以获取任何用户的完整锻炼日志。
10. 对用户日志的 GET /api/users/:_id/logs 请求会返回一个用户对象，其中包含一个 count 属性，表示属于该用户的锻炼数量。
11. 发送 GET 请求到 /api/users/:_id/logs 将返回带有 log 锻炼记录数组的用户对象。
12. 从 log 返回的 GET /api/users/:_id/logs 数组中的每个项目都是一个对象，应该具有 description 、 duration 和 date 属性。
13. description 属性应该是 log 数组中从 GET /api/users/:_id/logs 返回的任何对象的字符串。
14.任何一个从 GET /api/users/:_id/logs 返回的 log 数组中的对象的 duration 属性应该是一个数字。
15.任何一个从 GET /api/users/:_id/logs 返回的 log 数组中的对象的 date 属性应该是一个字符串。使用 Date API 的 dateString 格式。
16.你可以在 GET /api/users/:_id/logs 请求中添加 from 、 to 和 limit 参数来检索任何用户的日志的一部分。 from 和 to 是 yyyy-mm-dd 格式的日期。 limit 是一个整数，表示要返回多少条日志。
// http://localhost:3000/api/users/68027b54dcd62d946fc13f73/logs?from=1989-12-31&to=1990-01-04&limit=1
{
  username: "fcc_test",
  count: 1,
  _id: "5fb5853f734231456ccb3b05",
  log: [{
    description: "test",
    duration: 60,
    date: "Mon Jan 01 1990",
  }]
}
*/
app.get("/api/users/:_id/logs", (req, res) => {
  (async () => {
    // 查找用户
    let userId = req.params._id;
    let user = await User.findById(userId).exec();

    // 获取查询参数
    let {from, to, limit} = req.query;
    
    const query = {
      userId: userId
    };

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from; 
      if (to) query.date.$lte = to;
    }

    if (!limit) {
      limit = 0;
    }

    // 获取用户所有运动
    Exercise.find(query).select("description duration date").limit(limit)
    .then(exercises => {
      exercises.map(item => {
        item.date = new Date(item.date).toDateString();
      })
      
      let data = {
        _id: user._id,
        username: user.username,
        count: exercises.length,
        log: exercises
      };
      res.json(data);
    }).catch(err => {
      console.error("出错了：", err);
    });
  })();
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
