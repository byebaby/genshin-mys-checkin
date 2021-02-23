const {v4} = require('uuid');
const {_log, _warn, _err} = require('../utils/log');
const _ = require('lodash');
const {get, post} = require('axios').default;
const appds = require('./ds').appds;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = class MysAppClient {
    constructor(cookie) {
        this.app_headers = {
            'x-rpc-device_id': v4(),
            'x-rpc-client_type': '2',
            'x-rpc-app_version': '2.3.0',
            'user-agent': 'okhttp/4.8.0',
            referer: `https://app.mihoyo.com`,
            cookie,
        };
    }

    continuous_sign() {
        post(
            `https://api-takumi.mihoyo.com/apihub/sapi/signIn`,
            {"gids": "2"},
            {headers: {...this.app_headers, ds: appds()}}
        ).catch(e => {
            global.failed = true;
            _err('app签到请求失败', e.toString());
        })
    }

    view_post_0(post_id) {
        get(
            `https://api-takumi.mihoyo.com/post/api/getPostFull?post_id=${post_id}`,
            {headers: {...this.app_headers, ds: appds()}}
        ).catch(e => {
            global.failed = true;
            _err('app查看文章失败', e.toString());
        })
    }

    post_up_0(post_id) {
        post(
            'https://api-takumi.mihoyo.com/apihub/sapi/upvotePost',
            {is_cancel: false, post_id: post_id},
            {headers: {...this.app_headers, ds: appds()}},
        ).catch(e => {
            global.failed = true;
            _err('app点赞文章失败', e.toString());
        })
    }

    share_post_0(post_id) {
        get(
            `https://api-takumi.mihoyo.com/apihub/api/getShareConf?entity_id=${post_id}&entity_type=1`,
            {headers: {...this.app_headers, ds: appds()}}
        ).catch(e => {
            global.failed = true;
            _err('app分享文章失败', e.toString());
        })
    }

    appMybCheckin() {
        get(`https://bbs-api.mihoyo.com/post/api/feeds/posts?fresh_action=1&gids=2&last_id=`, {
            headers: this.app_headers,
        }).then(async ({data}) => {
            const list = _.get(data, 'data.list');
            let post_id_list = _.map(list, obj => {
                return _.get(obj, 'post.post_id');
            });

            for (let post_id of post_id_list.slice(0, 1)) {
                await delay(1000);
                this.continuous_sign(post_id)
            }
            for (let post_id of post_id_list.slice(0, 3)) {
                await delay(1000);
                this.view_post_0(post_id)
            }
            for (let post_id of post_id_list.slice(0, 5)) {
                await delay(1000);
                this.post_up_0(post_id)
            }
            for (let post_id of post_id_list.slice(0, 1)) {
                await delay(1000);
                this.share_post_0(post_id)
            }

            _log("米游币获取完成,请查收");
        }).catch(e => {
            global.failed = true;
            _err('米游币请求失败', e.toString());
        });

    }
}