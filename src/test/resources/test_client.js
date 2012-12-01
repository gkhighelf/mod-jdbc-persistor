/*
 * Copyright 2011-2012 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

load('test_utils.js')
load('vertx.js')

var tu = new TestUtils();

var eb = vertx.eventBus;

function testInvalidAction() {
  eb.send( 'test.persistor', {
    action: 'blahblahblah'
  }, function( reply ) {
    tu.azzert( reply.status === 'error' ) ;
    tu.testComplete() ;
  } )
}

function testConcurrency() {
  var todo = 10 ;
  var done = 0 ;

  eb.send( 'test.persistor', {
    action: 'execute',
    stmt: "CREATE FUNCTION sleep(seconds INTEGER, num INTEGER) RETURNS INTEGER " +
          "LANGUAGE JAVA DETERMINISTIC NO SQL EXTERNAL NAME " +
          "'CLASSPATH:com.bloidonia.vertx.mods.tests.JavaScriptPersistorTest.sleep'"
  }, function( reply ) {
    tu.azzert( reply.status === 'ok', reply.message ) ;
    var start = new Date() ;
    for( var i = 0 ; i < todo ; i++ ) {
      eb.send( 'test.persistor', {
        action: 'select',
        stmt:   'CALL sleep( 1, ' + ( i + 1 ) + ' )'
      }, function( reply ) {
        tu.azzert( reply.status === 'ok' ) ;
        done++ ;
        java.lang.System.out.println( "Done " + done + " (task " + reply.result[0][ '@p0' ] + " returned ok)" ) ;
        if( done == todo ) {
          var diff = new Date().getTime() - start.getTime() ;
          tu.azzert( diff < 5000, 'Expected time delay to be less than 5s, but it was ' + ( diff / 1000 ) + 's' ) ;
          tu.testComplete() ;
        }
      } ) ;
    }
  } )
}

function testSimpleSelect() {
  eb.send( 'test.persistor', {
    action: 'select',
    stmt:   'SELECT * FROM INFORMATION_SCHEMA.SYSTEM_USERS'
  }, function( reply ) {
    tu.azzert( reply.status === 'ok' ) ;
    tu.azzert( reply.result != undefined ) ;
    tu.testComplete() ;
  } )
}

function testBatchedSimpleSelector() {
  var num = 23;

  var received = 0;

  function createReplyHandler() {
    return function( reply, replier ) {
      received += reply.result.length ;
      if( received < num ) {
        tu.azzert( reply.result.length === 10 ) ;
        tu.azzert( reply.status === 'more-exist' ) ;
        replier( {}, createReplyHandler() ) ;
      } else {
        tu.azzert( reply.result.length === 3 ) ;
        tu.azzert( reply.status === 'ok' ) ;
        tu.azzert( received === num, 'Expected ' + num + 'records in total.  Got ' + received + ' insead' ) ;
        tu.testComplete() ;
      }
    }
  }

  eb.send( 'test.persistor', {
    action: 'execute',
    stmt:   'CREATE TABLE simpleselect ( id INTEGER GENERATED BY DEFAULT AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL, name VARCHAR(80), age INTEGER, CONSTRAINT simpleselectid PRIMARY KEY ( id ) )'
  }, function( reply ) {
    // Add some people
    tu.azzert(reply.status === 'ok');
    var values = []
    for( var i = 0 ; i < num ; i++ ) {
      values.push( [ 'tim', i ] ) ;
    }
    eb.send('test.persistor', {
      action: 'insert',
      stmt:  'INSERT INTO simpleselect ( name, age ) VALUES ( ?, ? )',
      values: values
    }, function( reply ) {
      tu.azzert( reply.status === 'ok' ) ;
      tu.azzert( reply.updated === num, 'updated should equal ' + num + ', actually was ' + reply.updated ) ;
      tu.azzert( reply.result.length === num, 'should get back ' + num + ', primary keys' ) ;
      eb.send('test.persistor', {
        action: 'select',
        stmt:   'SELECT * FROM simpleselect ORDER BY age ASC',
        batchsize: 10
      }, createReplyHandler() ) ;
    });
  } ) ;
}

function testCreateAndInsert() {
  eb.send( 'test.persistor', {
    action: 'execute',
    stmt:   'CREATE TABLE testing ( id INTEGER GENERATED BY DEFAULT AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL, name VARCHAR(80), age INTEGER, CONSTRAINT testid PRIMARY KEY ( id ) )'
  }, function( reply ) {
    tu.azzert( reply.status === 'ok' ) ;
    tu.azzert( reply.result == undefined ) ;
    eb.send( 'test.persistor', {
      action: 'insert',
      stmt:  'INSERT INTO testing( name, age ) VALUES ( ?, ? )',
      values: [ [ 'tim', 65 ], [ 'dave', 29 ], [ 'mike', 42 ] ]
    }, function( reply ) {
      tu.azzert( reply.status === 'ok' ) ;
      tu.azzert( reply.result != undefined ) ;
      tu.azzert( reply.result.length == 3 ) ;
      tu.azzert( reply.result[ 0 ].ID == 1 ) ;
      tu.azzert( reply.result[ 1 ].ID == 2 ) ;
      tu.azzert( reply.result[ 2 ].ID == 3 ) ;
      eb.send( 'test.persistor', {
        action: 'select',
        stmt:   'SELECT * FROM testing ORDER BY age ASC'
      }, function( reply ) {
        tu.azzert( reply.status === 'ok' ) ;
        tu.azzert( reply.result.length == 3 ) ;
        tu.azzert( reply.result[ 0 ].ID   === 2 ) ;
        tu.azzert( reply.result[ 0 ].NAME === 'dave' ) ;
        tu.azzert( reply.result[ 0 ].AGE  === 29 ) ;

        tu.azzert( reply.result[ 1 ].ID   === 3 ) ;
        tu.azzert( reply.result[ 1 ].NAME === 'mike' ) ;
        tu.azzert( reply.result[ 1 ].AGE  === 42 ) ;

        tu.azzert( reply.result[ 2 ].ID   === 1 ) ;
        tu.azzert( reply.result[ 2 ].NAME === 'tim' ) ;
        tu.azzert( reply.result[ 2 ].AGE  === 65 ) ;

        tu.testComplete() ;
      } ) ;
    } ) ;
  } )
}

function testCreateAndInsertViaStmt() {
  eb.send( 'test.persistor', {
    action: 'execute',
    stmt:   'CREATE TABLE testing2 ( id INTEGER GENERATED BY DEFAULT AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL, name VARCHAR(80), age INTEGER, CONSTRAINT testid2 PRIMARY KEY ( id ) )'
  }, function( reply ) {
    tu.azzert( reply.status === 'ok' ) ;
    tu.azzert( reply.result == undefined ) ;
    eb.send( 'test.persistor', {
      action: 'insert',
      stmt:  "INSERT INTO testing2( name, age ) VALUES ( 'tim', 65 ), ( 'dave', 29 ), ( 'mike', 42 )",
    }, function( reply ) {
      tu.azzert( reply.status === 'ok' ) ;
      tu.azzert( reply.result != undefined ) ;
      tu.azzert( reply.result.length == 3 ) ;
      tu.azzert( reply.result[ 0 ].ID == 1 ) ;
      tu.azzert( reply.result[ 1 ].ID == 2 ) ;
      tu.azzert( reply.result[ 2 ].ID == 3 ) ;
      eb.send( 'test.persistor', {
        action: 'select',
        stmt:   'SELECT * FROM testing2 ORDER BY age ASC'
      }, function( reply ) {
        tu.azzert( reply.status === 'ok' ) ;
        tu.azzert( reply.result.length == 3 ) ;
        tu.azzert( reply.result[ 0 ].ID   === 2 ) ;
        tu.azzert( reply.result[ 0 ].NAME === 'dave' ) ;
        tu.azzert( reply.result[ 0 ].AGE  === 29 ) ;

        tu.azzert( reply.result[ 1 ].ID   === 3 ) ;
        tu.azzert( reply.result[ 1 ].NAME === 'mike' ) ;
        tu.azzert( reply.result[ 1 ].AGE  === 42 ) ;

        tu.azzert( reply.result[ 2 ].ID   === 1 ) ;
        tu.azzert( reply.result[ 2 ].NAME === 'tim' ) ;
        tu.azzert( reply.result[ 2 ].AGE  === 65 ) ;

        tu.testComplete() ;
      } ) ;
    } ) ;
  } )
}

function testHammerInsert() {
  eb.send( 'test.persistor', {
    action: 'execute',
    stmt:   'CREATE TABLE testing3 ( id INTEGER GENERATED BY DEFAULT AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL, age INTEGER, CONSTRAINT testid3 PRIMARY KEY ( id ) )'
  }, function( reply ) {
    tu.azzert( reply.status === 'ok' ) ;
    tu.azzert( reply.result == undefined ) ;
    var valueList = []
    var hammerSize = 2000
    for( i = 0 ; i < hammerSize ; i++ ) {
      valueList.push( [ i ] )
    }
    eb.send( 'test.persistor', {
      action: 'insert',
      stmt:  "INSERT INTO testing3( age ) VALUES ( ? )",
      values: valueList
    }, function( reply ) {
      tu.azzert( reply.status === 'ok' ) ;
      tu.azzert( reply.result != undefined ) ;
      tu.azzert( reply.result.length == hammerSize ) ;
      eb.send( 'test.persistor', {
        action: 'select',
        stmt:   'SELECT COUNT( * ) AS CNT FROM testing3'
      }, function( reply ) {
        tu.azzert( reply.status === 'ok' ) ;
        tu.azzert( reply.result[ 0 ].CNT   === hammerSize ) ;
        tu.testComplete() ;
      } ) ;
    } ) ;
  } )
}

function testHammerParallel() {
  var valueList = [] ;
  var hammerSize = 200 ;
  var loops = 10 ;
  for( i = 0 ; i < hammerSize ; i++ ) {
    valueList.push( [ i ] )
  }
  eb.send( 'test.persistor', {
    action: 'execute',
    stmt:   'CREATE TABLE testing4 ( id INTEGER GENERATED BY DEFAULT AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL, age INTEGER, CONSTRAINT testid4 PRIMARY KEY ( id ) )'
  }, function( reply ) {
    tu.azzert( reply.status === 'ok' ) ;
    tu.azzert( reply.result == undefined ) ;
    for( i = 0 ; i < loops ; i++ ) {
      eb.send( 'test.persistor', {
        action: 'insert',
        stmt:  "INSERT INTO testing4( age ) VALUES ( ? )",
        values: valueList
      }, function( reply ) {
        tu.azzert( reply.status === 'ok' ) ;
        tu.azzert( reply.result != undefined ) ;
        tu.azzert( reply.result.length == hammerSize ) ;
      } ) ;
    }
    java.lang.Thread.sleep( 2000 ) ;
    eb.send( 'test.persistor', {
      action: 'select',
      stmt:   'SELECT COUNT( * ) AS CNT FROM testing4'
    }, function( reply ) {
      tu.azzert( reply.status === 'ok' ) ;
      tu.azzert( reply.result[ 0 ].CNT   === hammerSize * loops ) ;
      tu.testComplete() ;
    } ) ;
  } )
}

function testRollback() {
  eb.send( 'test.persistor', {
    action: 'execute',
    stmt:   'CREATE TABLE trans ( id INTEGER GENERATED BY DEFAULT AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL, name VARCHAR(80), age INTEGER, CONSTRAINT transid PRIMARY KEY ( id ) )'
  }, function( reply ) {
    tu.azzert( reply.status === 'ok' ) ;
    tu.azzert( reply.result == undefined ) ;
    eb.send( 'test.persistor', {
      action: 'transaction'
    }, function( reply, replier ) {
      tu.azzert( reply.status === 'ok' ) ;
      tu.azzert( reply.result == undefined ) ;
      replier( {
        action: 'insert',
        stmt:  'INSERT INTO trans( name, age ) VALUES ( ?, ? )',
        values: [ [ 'tim', 65 ], [ 'dave', 29 ], [ 'mike', 42 ] ]
      }, function( reply, replier ) {
        tu.azzert( reply.status === 'ok' ) ;
        tu.azzert( reply.result.length == 3 ) ;
        replier( {
          action:'rollback'
        }, function( reply ) {
          tu.azzert( reply.status === 'ok' ) ;
          eb.send( 'test.persistor', {
            action: 'select',
            stmt:   'SELECT * FROM trans ORDER BY age ASC'
          }, function( reply ) {
            tu.azzert( reply.status === 'ok' ) ;
            tu.azzert( reply.result.length == 0 ) ;
            tu.testComplete() ;
          } ) ;
        } ) ;
      } ) ;
    } ) ;
  } ) ;
}

function testCommit() {
  eb.send( 'test.persistor', {
    action: 'execute',
    stmt:   'CREATE TABLE trans2 ( id INTEGER GENERATED BY DEFAULT AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL, name VARCHAR(80), age INTEGER, CONSTRAINT trans2id PRIMARY KEY ( id ) )'
  }, function( reply ) {
    tu.azzert( reply.status === 'ok' ) ;
    tu.azzert( reply.result == undefined ) ;
    eb.send( 'test.persistor', {
      action: 'transaction'
    }, function( reply, replier ) {
      tu.azzert( reply.status === 'ok' ) ;
      tu.azzert( reply.result == undefined ) ;
      replier( {
        action: 'insert',
        stmt:  'INSERT INTO trans( name, age ) VALUES ( ?, ? )',
        values: [ [ 'tim', 65 ], [ 'dave', 29 ], [ 'mike', 42 ] ]
      }, function( reply, replier ) {
        tu.azzert( reply.status === 'ok' ) ;
        tu.azzert( reply.result.length == 3 ) ;
        replier( {
          action:'commit'
        }, function( reply ) {
          tu.azzert( reply.status === 'ok' ) ;
          eb.send( 'test.persistor', {
            action: 'select',
            stmt:   'SELECT * FROM trans ORDER BY age ASC'
          }, function( reply ) {
            tu.azzert( reply.status === 'ok' ) ;
            tu.azzert( reply.result.length == 3 ) ;
            tu.azzert( reply.result[ 0 ].NAME == 'dave', 'Expected Dave first' ) ;
            tu.azzert( reply.result[ 1 ].NAME == 'mike', 'Mike should be second' ) ;
            tu.azzert( reply.result[ 2 ].NAME == 'tim', 'And Tim last' ) ;
            tu.testComplete() ;
          } ) ;
        } ) ;
      } ) ;
    } ) ;
  } ) ;
}
//
tu.registerTests(this);
var persistorConfig = { address: 'test.persistor' }
vertx.deployModule('com.bloidonia.jdbc-persistor-v' + java.lang.System.getProperty('vertx.version'), persistorConfig, 1, function() {
  // Wait for the work-queue to power up...
  java.lang.Thread.sleep( 2000 ) ;
  tu.appReady();
});

function vertxStop() {
  tu.unregisterAll();
  tu.appStopped();
}