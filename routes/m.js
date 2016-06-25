/**
 * Created by stitchcula on 16-4-11.
 */

import Router from 'koa-router'
import request from 'co-request'
import parse from 'co-body'

const router=new Router()

const proxyHost="http://iot.shibeta.org:806"

router.use('/',async (ctx,next)=>{
    if(!(ctx.session&&ctx.session.token))
        return ctx.render('redirectLogin')
    await next()
})

router.get('/',async (ctx,next)=>{
    var res=await request({uri:proxyHost+"/user?token=000002"+ctx.session.token+"&uin="+ctx.session.uin,method:'GET'})
    res.body=JSON.parse(res.body)
    if(ctx.session.room) {
        var roomMsg=ctx.redis.hgetall(ctx.session.room)
        if(roomMsg.state==1)
            ctx.render('play',{user:res.body,without_footer:1})
        if(roomMsg.state==0)
            ctx.render('room',{
                user:res.body,
                without_footer:1,
                room_name:roomMsg.name,
                room_time:roomMsg.time,
                title:"BBB - uno房间",
                default_face:"/static/img/default_face.jpg",
                title_img:"/static/img/login_title_img.jpg",
                slides:[
                    {img:"/static/img/bg1.jpg"},
                    {img:"/static/img/bg2.jpg"},
                    {img:"/static/img/bg3.jpg"}
                ]
            })
    }else
        ctx.render('hall',{
            user:res.body,
            without_footer:1,
            title:"BBB - uno大厅",
            default_face:"/static/img/default_face.jpg",
            title_img:"/static/img/login_title_img.jpg",
            slides:[
                {img:"/static/img/bg1.jpg"},
                {img:"/static/img/bg2.jpg"},
                {img:"/static/img/bg3.jpg"}
            ]
        })
    await next()
})

//room get(delete) new in out
router.get('/room',async (ctx,next)=>{

    await next();
}).post('/room',async (ctx,next)=>{
    var {name,sid}=await parse.json(ctx)
    if(!/^[\u4E00-\u9FA50-9a-zA-Z_]{4,20}$/.test(name))
        return ctx.body={result:403}
    var roomMsg={
        name:name,
        sid:new Date().getTime()+crypto.createHmac('sha1',name).digest('hex').substr(0,18),
        time:new Date().getTime(),
        cards:[],//牌堆【首牌初始化
        members:[ctx.session.uin],//成员 【为0时回收
        seq:[],//次序【首牌初始化
        discards:[],//弃牌堆【首牌初始化
        mark:0,//上一回合时间【首牌初始化
        state:0,//0 等待 1 进行中 -1 已完成 【-1回收至数据库
        limit:8//人数限制
    }
    // user's uin -> mongo room list -> redis room msg
    ctx.session.room=roomMsg.sid
    await ctx.mongo.collection('rooms').insertOne({name:roomMsg.name,sid:roomMsg.sid,member:1})
    await ctx.redis.hmset(roomMsg.sid,roomMsg)
    ctx.body={result:200}
    await next();
}).put('/room',async (ctx,next)=>{
    var {name,sid}=await parse.json(ctx)
    var roomMsg=ctx.redis.hgetall(sid)
    if(roomMsg.members.find(it=>it==ctx.session.uin))
        return ctx.body={result:406} //重复进入
    if(!(roomMsg.state==0&&roomMsg.members.length<roomMsg.limit))
        return ctx.body={result:423} //锁定房间
    ctx.session.room=roomMsg.sid
    roomMsg.members.push(ctx.session.uin)
    await ctx.redis.hmset(roomMsg.sid,roomMsg)
    await ctx.mongo.collection('rooms').updateOne({sid: roomMsg.sid},
        {"$set": {member:roomMsg.members.length}}, {upsert: true})
    ctx.body={result:200}
    await next();
}).del('/room',async (ctx,next)=>{
    if(!ctx.session.room)
        return ctx.body={result:403}
    var roomMsg=ctx.redis.hgetall(ctx.session.room)
    if(roomMsg.state!=0)
        return ctx.body={result:403}
    delete ctx.session.room
    for(var i=0;i<roomMsg.members.length;i++)
        if(roomMsg.members[i]==ctx.session.uin)
            roomMsg.members.splice(i,1)
    await ctx.redis.hmset(roomMsg.sid,roomMsg)
    await ctx.mongo.collection('rooms').updateOne({sid: roomMsg.sid},
        {"$set": {member:roomMsg.members.length}}, {upsert: true})
    ctx.body={result:200}
    await next();
})

//card get post
router.get('/card',async (ctx,next)=>{//首次get触发开始

    await next();
}).post('/card',async (ctx,next)=>{

    await next();
})

router.get('/poll',async (ctx,next)=>{

    await next();
})

export {router}