/*
 * Copyright 2012-2013 the original author or authors.
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

package org.apache.commons.dbutils.handlers ;

import java.sql.ResultSet ;
import java.sql.SQLException ;

import java.util.ArrayList ;
import java.util.List ;
import java.util.Map ;

public class LimitedMapListHandler extends MapListHandler {
  private int limit ;
  private boolean expired = false ;

  public LimitedMapListHandler() {
    this( -1 ) ;
  }

  public LimitedMapListHandler( int limit ) {
    this.limit = limit ;
  }

  @Override
  public List<Map<String,Object>> handle( ResultSet rs ) throws SQLException {
    List<Map<String,Object>> rows = new ArrayList<Map<String,Object>>();
    while( limit == -1 || rows.size() < limit ) {
      if( rs.next() ) {
        rows.add( this.handleRow( rs ) ) ;
      }
      else {
        expired = true ;
        break ;
      }
    }
    return rows ;
  }

  public boolean isExpired() {
    return expired ;
  }
}