/**
 * GuoXue App
 * TODO:
 *   1. fail & retry OK
 *   2. local-cache & fetch OK
 *   3. activity-portial forbidden
 *   4. http error handle(fetch) OK
 *   5. release build
 * https://github.com/chuanyi/guoxue
 */
'use strict';
import React, {
  AppRegistry,
  AsyncStorage,
  BackAndroid,
  Component,
  Dimensions,
  Image,
  Text,
  ListView,
  Navigator,
  ScrollView,
  StyleSheet,
  TouchableHighlight,
  ToastAndroid,
  ToolbarAndroid,
  View
} from 'react-native';
var ProgressBar = require('ProgressBarAndroid')

var API_BASE = "http://115.28.211.212:8866/api/";
var BOOKS    = "books?";
var INDEXES  = "indexes?";
var CONTENTS = "contents?";

var STATE_LOADING = "loading";  // FSM: loading->fail, loading->normal, fail->loading
var STATE_FAILURE = "fail";
var STATE_NORMAL  = "normal";

var _route;
var _navigator;
// Todo: implement touch back again to quit app
BackAndroid.addEventListener('hardwareBackPress', function() {
  if (_navigator) {
    if (_route == 'indexes' || _route == 'contents') {
      _navigator.pop();
      return true;
    }
  }
  return false;
});

var _isArray = (obj) => {
  return Object.prototype.toString.call(obj) === '[object Array]';
}

var _cacheOrFetch = function(rela) {
  return new Promise(function(resolve, reject){
    AsyncStorage.getItem(rela, (err, val)=>{
      if(err != null) {
        reject(err);
      }else{
        if (val != null) {
          try{
            //ToastAndroid.show('load from local ok',ToastAndroid.SHORT);
            resolve(JSON.parse(val));
          }catch(err){
            reject(err);
          }
        }else{
          fetch(API_BASE+rela)
            .then((res) => res.json())
            .then((json) => {
              if(_isArray(json)) {
                AsyncStorage.setItem(rela, JSON.stringify(json));
                //ToastAndroid.show('save to local',ToastAndroid.SHORT);
                resolve(json);
              } else {
                reject(json.err);
              }
            })
            .catch((err)=>{
              reject(err);
            });
        }
      }
    });
  });
}

class Loading extends Component {
  render() {
    return (
      <View style={{height:this.props.height,alignItems:'center',justifyContent:'center'}}>
         <ProgressBar styleAttr="Inverse" />
         <Text>正在加载{this.props.ctx},请稍后...</Text>
      </View>
    );
  }
}

class FailRefresh extends Component {
  render() {
    return (
        <View style={{height:this.props.height,alignItems:'center',justifyContent:'center'}}>
          <Image source={require('./fail.png')} style={{width:100,height:100}}/>
          <Text>加载{this.props.ctx}失败:{this.props.err}</Text>
          <TouchableHighlight onPress={this.props.retry}>
            <Text style={{fontSize:18}}>(点击此处刷新重试)</Text>
          </TouchableHighlight>
        </View>
    );
  }
}

class Books extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cur: STATE_LOADING,
      cates: [],
      err:''
    };
  }

  componentDidMount() {
    this.fetch();
  }

  fetch() {
    this.setState({ cur: STATE_LOADING });
    _cacheOrFetch(BOOKS+"lang=zhs")
      .then((data)=>{
        this.setState({ cur: STATE_NORMAL, cates:data });
      })
      .catch((err)=>{
        this.setState({ cur: STATE_FAILURE, err: ''+err });
      });
  }

  makeBooks(books) {
    var items = [];
    let fsMap = {'1':20,'2':20,'3':20,'4':18,'5':16,'6':14,'7':12,'8':10,'9':8,'10':6};
    for (var i = 0; i < books.length; i++) {
      let book = {id:books[i].id, title:books[i].title, desc:books[i].desc};
      let nameStyle = {
        marginTop:5,
        width:30,
        fontWeight:'bold',
        fontSize:fsMap[''+book.title.length],
      };
      if (book.title.length>=6){
        nameStyle.width = 20;
      }
      items[i] = (
        <TouchableHighlight key={i} onPress={()=>this.props.onBook(book)} style={styles.book}>
           <Text style={nameStyle}>{book.title}</Text>
        </TouchableHighlight>
      );
    }
    return items;
  }

  makeCates() {
    var items = [];
    for (var i = 0; i < this.state.cates.length; i++) {
      items[i] = (
        <View key={i} style={{borderColor:'#E6E5E6'}}>
          <Text style={{color:'#4A4A4A',fontSize:20,fontWeight:'bold',marginLeft:10,marginTop:5}}>{this.state.cates[i].title}</Text>
          <ScrollView horizontal={true}>
            {this.makeBooks(this.state.cates[i].books)}
          </ScrollView>
          <View style={{height:20,backgroundColor:'#EEEEEE'}} />
        </View>
      );
    }
    return items;
  }

  render() {
    var view;
    if (this.state.cur == STATE_LOADING) {
      view = (<Loading ctx={"书目"} height={Dimensions.get('window').height-56-24} />);
    }else if(this.state.cur == STATE_FAILURE) {
      view = (<FailRefresh ctx={"书目"} height={Dimensions.get('window').height-56-24} err={this.state.err} retry={this.fetch.bind(this)}/>);
    }else if (this.state.cur == STATE_NORMAL){ // normal
      view = (<ScrollView >{this.makeCates()}</ScrollView>);
    } 
    return (
      <View style={{height:Dimensions.get('window').height-24}}>
        <View style={styles.toolbar}>
          <Image source={require('./ic_launcher.png')} style={{width:36,height:36,marginLeft:12}}/>
          <Text style={{color:'#FFFFFF',fontSize:24,fontWeight:'bold',left:Dimensions.get('window').width/2-56-42}}>{"国学经典"}</Text>
        </View>
        {view}
      </View>
    );
  }
}

class Indexes extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cur: STATE_LOADING,
      indexes: [],
      err:''
    };
  }

  componentDidMount() {
    this.fetch();
  }

  fetch() {
    this.setState({ cur: STATE_LOADING });
    _cacheOrFetch(INDEXES+"lang=zhs&id="+this.props.book.id)
      .then((data)=>{
        this.setState({ cur: STATE_NORMAL, indexes:data });
      })
      .catch((err)=>{
        this.setState({ cur: STATE_FAILURE, err: ''+err });
      });
  }

  makeIndexes(indexes, level) {
    var items = [];
    for (var i = 0; i < indexes.length; i++) {
      var idx = indexes[i];
      if(typeof(idx.subs) != 'undefined' && idx.subs != null) {
        items.push(
          <Text key={idx.id} style={{margin:5,backgroundColor:'#EFEFEF',color:'#9B9B9B',fontSize:16}}>{idx.title}</Text>
        );
        items.push(...this.makeIndexes(idx.subs, level+1));
      }else{
        let cidx = {id:idx.id, title:idx.title, bookTitle:this.props.book.title};
        items.push(
          <TouchableHighlight key={idx.id} onPress={()=>this.props.onIndex(cidx)} style={styles.itemWrapper}>        
          <View>
            <View style={{height:40,flexDirection:'row', alignItems:'center'}}>
             <View style={{marginLeft:10, borderRadius:4, width:8, height:8,backgroundColor:'#D0A95D'}} />
             <Text style={{marginLeft:15, color:'#4A4A4A',fontSize:20,fontWeight:'bold'}}>{idx.title}</Text>
            </View>
            <View style={{height:2, backgroundColor:'#EEEEEE'}}/>
            </View>
          </TouchableHighlight>
        );
      }
    }
    return items;
  }

  render() {
    var view;
    if (this.state.cur == STATE_LOADING) {
      view = (<Loading ctx={this.props.book.title} height={Dimensions.get('window').height-56-56-24} />);
    }else if(this.state.cur == STATE_FAILURE) {
      view = (<FailRefresh ctx={this.props.book.title} height={Dimensions.get('window').height-56-56-24} err={this.state.err} retry={this.fetch.bind(this)}/>);
    }else if (this.state.cur == STATE_NORMAL){ // normal
      view = (<ScrollView >{this.makeIndexes(this.state.indexes,0)}</ScrollView>);
    }
    return (
      <View style={{height:Dimensions.get('window').height-20}}>
        <View style={styles.toolbar}>
         <TouchableHighlight onPress={this.props.onBack}>
          <Image source={require('./ic_back_white.png')} style={{width:36,height:36,marginLeft:12,backgroundColor:'#D7A563'}}/>
         </TouchableHighlight> 
          <Text style={{color:'#FFFFFF',fontSize:24,fontWeight:'bold',left:Dimensions.get('window').width/2-(this.props.book.title.length*10)-62}}>{this.props.book.title}</Text>
        </View>
        <View>
          <Text style={{color:'#4A4A4A',fontSize:20,fontWeight:'bold',marginLeft:10,marginTop:5}}>{"《"+this.props.book.title+"》"}</Text>
          <Text style={{color:'#4A4A4A',fontSize:18,marginLeft:10,marginTop:5}}>{this.props.book.desc}</Text>
        </View>
        <View style={{height:10,borderBottomColor:'#EEEEEE',borderBottomWidth:2}}/>
        {view}
      </View>
    );
  }
}

class Contents extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cur: STATE_LOADING,
      contents: [],
      err:''
    };
  }

  componentDidMount() {
    this.fetch();
  }

  fetch() {
    this.setState({ cur: STATE_LOADING });
    _cacheOrFetch(CONTENTS+"lang=zhs&id="+this.props.index.id)
      .then((data)=>{
        this.setState({ cur: STATE_NORMAL, contents:data });
      })
      .catch((err)=>{
        this.setState({ cur: STATE_FAILURE, err: ''+err });
      });
  }

  makeContents() {
    var items = [];
    var csMap = {'t':styles.txtTitle, 'r':styles.txtRaw, 'm':styles.txtComent};
    for (var i = 0; i < this.state.contents.length; i++) {
      var cnt = this.state.contents[i];
      items.push(<Text key={i} style={csMap[cnt.t]}>{cnt.d}</Text>);
    }
    return items;
  }

  render() {
    var view;
    if (this.state.cur == STATE_LOADING) {
      view = (<Loading ctx={this.props.index.title} height={Dimensions.get('window').height-28-24} />);
    }else if(this.state.cur == STATE_FAILURE) {
      view = (<FailRefresh ctx={this.props.index.title} height={Dimensions.get('window').height-28-24} err={this.state.err} retry={this.fetch.bind(this)}/>);
    }else if (this.state.cur == STATE_NORMAL){ // normal
      view = (<ScrollView >{this.makeContents()}</ScrollView>);
    }
    return (
      <View style={{height:Dimensions.get('window').height-24}}>
        <Text style={{color:'#9E9E9E', fontSize:16, marginLeft:10}}>{this.props.index.bookTitle+' - '+this.props.index.title}</Text>
        {view}
      </View>
    );
  }
}

class App extends Component {
  render() {
    return (
      <Navigator
        initialRoute={{ name:'books' }}
        renderScene={(route, navigator) => {
          _route = route.name;
          _navigator = navigator;
          var back = () => { navigator.pop(); }
          if (route.name == 'books') {
            return (<Books onBook={(b)=>{ navigator.push({name:'indexes',book:b}); }} />);
          } else if (route.name == 'indexes') {
            return (<Indexes onIndex={(idx)=>{ navigator.push({name:'contents',index:idx}); }}
              book={route.book} onBack={back} />);
          } else if (route.name == 'contents') {
            return (<Contents index={route.index} onBack={back} />);
          }
        }}
      />
    );
  }
}

var styles = StyleSheet.create({
  book: {
    width:70,
    height:110,
    backgroundColor: '#B69453',
    alignItems: 'flex-end',
    margin: 8,
  },
  toolbar: {
    backgroundColor: '#D7A563',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  txtTitle: {
    margin: 10,
    fontSize: 20,
    fontWeight: 'bold',
  },
  txtRaw: {
    color:'#424242',
    marginLeft: 10,
    marginRight: 10,
    marginTop: 5,
    marginBottom: 5,
    fontSize: 18,
    lineHeight: 28,
  },
  txtComent: {
    color:'#4A4A4A',
    marginLeft: 10,
    marginRight: 10,
    marginTop: 5,
    marginBottom: 5,
    fontSize: 16,
    lineHeight: 24,
  }
});

AppRegistry.registerComponent('cnbooks', () => App);
