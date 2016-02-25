/**
 * ZhuZiBaiJia App
 * Controls:
 *    BackAndroid - back or exit app
 *    Navigator - router between books/index/content
 *    
 * https://github.com/facebook/react-native
 */
'use strict';
import React, {
  AppRegistry,
  Component,
  Text,
  ListView,
  Navigator,
  StyleSheet,
  TouchableHighlight,
  ToastAndroid,
  View
} from 'react-native';

var API_BASE = "http://115.28.211.212:8866/api/"
var BOOKS    = "books?"
var INDEXES  = "indexes?"
var CONTENTS = "contents?"

var _navigator;

class VContents extends Component {

}

class VIndexes extends Component {

}

class VBooks extends Component {
  constructor(props) {
    super(props);
    this.state = {
      blob:{},
      ds: new ListView.DataSource({
        rowHasChanged: (r1, r2) => r1 !== r2,
        sectionHeaderHasChanged: (h1, h2) => h1 !== h2,
      })
    };
  }

  componentDidMount() {
    this.fetchData();
  }

  fetchData() {
    fetch(API_BASE+BOOKS+"lang=zhs")
      .then((res) => res.json())
      .then((json) => {
        var b = this.state.blob;
        for (var i = 0; i < json.length; i++) {
           b[json[i].title] = json[i].books;
        }
        this.setState({
          blob: b,
          ds: this.state.ds.cloneWithRowsAndSections(this.state.blob),
        });
      })
      .done();
  }

  render() {
    return (
      <ListView 
        pageSize={25}
        style={styles.list}
        dataSource={this.state.ds}
        renderRow={this.renderRow}
        renderSectionHeader={this.renderSectionHeader} />
    );
  }

  _handlePress() {

  }

  renderRow(raw, secID, rowID) {
    return (
      //<View>
        <TouchableHighlight onPress={() => this._handlePress()}>
          <View style={styles.row}>
            <Text style={styles.rowTitleText}>{raw.title}</Text>
            <Text style={styles.rowDetailText}>{raw.desc}</Text>
          </View>
        </TouchableHighlight>
        //<View style={styles.separator} />
      //</View>
    );
  }

  // handleRowPress(id) {
  //   // const { navigator } = this.props;
  //   // if(navigator) {
  //   //   navigator.push({
  //   //     name:'indexes',
  //   //     component: VIndexes,
  //   //   });
  //   // }
  // }

  renderSectionHeader(sectionData, sectionID) {
    return (
        <Text style={styles.sectionHeader}>{sectionID}</Text>
    );
  }
}

class VGuoXue extends Component {
   render() {
      var defName = 'books';
      var defV = VBooks;
      return (
        <Navigator
          initialRoute={{name:'books'}}
          renderScene={(route, nav) => {
            if (route.name == 'books') {
              return <VBooks navigator={nav} />;
            } else if (route.name == 'indexes') {
              return <VIndexes navigator={nav} />;
            } else if (route.name == 'contents') {
              return <VContents navigator={nav} />;
            }
          }} />
      );
   }
}

var styles = StyleSheet.create({
  list: {
    backgroundColor: '#eeeeee',
  },
  sectionHeader: {
    padding: 5,
    fontWeight: '500',
    fontSize: 14,
  },
  row: {
    backgroundColor: 'white',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#bbbbbb',
    marginLeft: 15,
  },
  rowTitleText: {
    fontSize: 17,
    fontWeight: '500',
  },
  rowDetailText: {
    fontSize: 15,
    color: '#888888',
    lineHeight: 20,
  },
});

AppRegistry.registerComponent('cnbooks', () => VGuoXue);
