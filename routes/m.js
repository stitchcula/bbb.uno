/**
 * Created by stitchcula on 16-4-11.
 */

import Router from 'koa-router'
import request from 'co-request'
import parse from 'co-body'
import crypto from 'crypto'

const router=new Router()

const proxyHost="http://iot.shibeta.org:806"

router.use('/',async (ctx,next)=>{
    if(!(ctx.session&&ctx.session.token))
        return ctx.render('redirectLogin')
    var nuc_base=await ctx.mongo.db("nuc").collection("nuc_base").find({uin:ctx.session.uin}).toArray()
    var nuc_uno=await ctx.mongo.db("nuc").collection("nuc_uno").find({uin:ctx.session.uin}).toArray()
    ctx.userMsg={nuc_base:nuc_base[0],nuc_uno:nuc_uno[0]}
    await next()
})

router.get('/',async (ctx,next)=>{
    if(ctx.userMsg.nuc_uno.room&&ctx.userMsg.nuc_uno.room.length>14) {
        ctx.session.room=ctx.userMsg.nuc_uno.room
        var roomMsg=JSON.parse(await ctx.redis.get(ctx.session.room))
        if(!roomMsg){
            ctx.userMsg.nuc_uno.room=""
            var res=await request({uri:proxyHost+"/user?token=000002"+ctx.session.token+"&uin="+ctx.session.uin,
                method:'PUT',body:JSON.stringify(ctx.userMsg)})
            ctx.session.room=null
            return ctx.redirect('/m')
        }
        if(roomMsg.state==1)
            ctx.render('play',{user:ctx.userMsg,without_footer:1})
        if(roomMsg.state==0)
            ctx.render('room',{
                user:ctx.userMsg,
                without_footer:1,
                room_name:roomMsg.name,
                room_sid:roomMsg.sid,
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
            user:ctx.userMsg,
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
router.get('/room',async (ctx,next)=>{//getAll getOne setLimit
    if(!ctx.query.sid){
        var roomsMsg=await ctx.mongo.collection('rooms').find({member:{$gt:0,$lte:8},state:0}).limit(24).toArray()
        return ctx.body={result:200,rooms:roomsMsg}
    }else{
        if(!ctx.query.limit){
            if(!ctx.session.room||ctx.session.room!=ctx.query.sid)
                return ctx.body={result:403}
            var roomMsg=JSON.parse(await ctx.redis.get(ctx.session.room))
            delete roomMsg.cards
            delete roomMsg.seq
            delete roomMsg.discards
            for(var i=0;i<roomMsg.members.length;i++){
                var nuc_base=await ctx.mongo.db("nuc").collection("nuc_base").find({uin:roomMsg.members[i]}).toArray()
                var nuc_uno=await ctx.mongo.db("nuc").collection("nuc_uno").find({uin:roomMsg.members[i]}).toArray()
                roomMsg.members[i]={
                    uin:roomMsg.members[i],
                    name:nuc_base[0].account,
                    game:nuc_uno[0].game,
                    win:nuc_uno[0].win,
                    level:nuc_uno[0].level
                }
            }
            return ctx.body={result:200,room:roomMsg}
        }else{
            if(!ctx.session.room||ctx.session.room!=ctx.query.sid)
                return ctx.body={result:403}
            var roomMsg=JSON.parse(await ctx.redis.get(ctx.session.room))
            if(roomMsg.members[0]!=ctx.session.uin)
                return ctx.body={result:403}
            roomMsg.limit=parseInt(ctx.query.limit)
            await ctx.redis.set(roomMsg.sid,JSON.stringify(roomMsg))
            await ctx.mongo.collection('rooms').updateOne({sid: roomMsg.sid},
                {"$set": {limit:roomMsg.limit}}, {upsert: true})
            return ctx.body={result:200}
        }
    }
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
    ctx.userMsg.nuc_uno.room=ctx.session.room
    var res=await request({uri:proxyHost+"/user?token=000002"+ctx.session.token+"&uin="+ctx.session.uin,
        method:'PUT',body:JSON.stringify(ctx.userMsg)})
    await ctx.mongo.collection('rooms').insertOne({name:roomMsg.name,sid:roomMsg.sid,member:1,limit:8,state:0})
    await ctx.redis.set(roomMsg.sid,JSON.stringify(roomMsg))
    ctx.body={result:200}
    await next();
}).put('/room',async (ctx,next)=>{
    var {name,sid}=await parse.json(ctx)
    var roomMsg=JSON.parse(await ctx.redis.get(sid))
    if(roomMsg.members.find(it=>it==ctx.session.uin))
        return ctx.body={result:406} //重复进入
    if(!(roomMsg.state==0&&roomMsg.members.length<roomMsg.limit))
        return ctx.body={result:423} //锁定房间
    ctx.session.room=roomMsg.sid
    ctx.userMsg.nuc_uno.room=ctx.session.room
    var res=await request({uri:proxyHost+"/user?token=000002"+ctx.session.token+"&uin="+ctx.session.uin,
        method:'PUT',body:JSON.stringify(ctx.userMsg)})
    roomMsg.members.push(ctx.session.uin)
    await ctx.redis.set(roomMsg.sid,JSON.stringify(roomMsg))
    await ctx.mongo.collection('rooms').updateOne({sid: roomMsg.sid},
        {"$set": {member:roomMsg.members.length}}, {upsert: true})
    ctx.body={result:200}
    await next();
}).del('/room',async (ctx,next)=>{
    if(!ctx.session.room)
        return ctx.body={result:403}
    var roomMsg=JSON.parse(await ctx.redis.get(ctx.session.room))
    if(roomMsg.state!=0)
        return ctx.body={result:403}
    ctx.userMsg.nuc_uno.room=""
    var res=await request({uri:proxyHost+"/user?token=000002"+ctx.session.token+"&uin="+ctx.session.uin,
        method:'PUT',body:JSON.stringify(ctx.userMsg)})
    res.body=JSON.parse(res.body)//todo:check response
    delete ctx.session.room
    for(var i=0;i<roomMsg.members.length;i++)
        if(roomMsg.members[i]==ctx.session.uin)
            roomMsg.members.splice(i,1)
    await ctx.redis.set(roomMsg.sid,JSON.stringify(roomMsg))
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