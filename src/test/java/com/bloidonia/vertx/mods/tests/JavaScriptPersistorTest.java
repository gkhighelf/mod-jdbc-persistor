package com.bloidonia.vertx.mods.tests ;

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

import org.junit.Test;
import org.vertx.java.testframework.TestBase;

public class JavaScriptPersistorTest extends TestBase {

  public static int sleep( int seconds, int id ) {
    try {
      Thread.sleep( seconds * 1000 ) ;
      return id ;
    }
    catch( Exception e ) {
      return -id ;
    }
  }

  @Override
  protected void setUp() throws Exception {
    super.setUp();
    startApp("test_client.js");
  }

  @Override
  protected void tearDown() throws Exception {
    super.tearDown();
  }

  @Test
  public void testConcurrency() throws Exception {
    startTest(getMethodName());
  }

  @Test
  public void testBatchedSimpleSelector() throws Exception {
    startTest(getMethodName());
  }

  @Test
  public void testSimpleSelect() throws Exception {
    startTest(getMethodName());
  }

  @Test
  public void testInvalidAction() throws Exception {
    startTest(getMethodName());
  }

  @Test
  public void testCreateAndInsert() throws Exception {
    startTest(getMethodName());
  }

  @Test
  public void testCreateAndInsertViaStmt() throws Exception {
    startTest(getMethodName());
  }

  @Test
  public void testHammerInsert() throws Exception {
    startTest(getMethodName());
  }

  @Test
  public void testHammerParallel() throws Exception {
    startTest(getMethodName());
  }

  @Test
  public void testRollback() throws Exception {
    startTest(getMethodName());
  }

  @Test
  public void testCommit() throws Exception {
    startTest(getMethodName());
  }
}

