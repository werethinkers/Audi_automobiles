import os
import sys
 
# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
 
from app.core.database import Base
from app.models import rm_models
from sqlalchemy import create_engine
from sqlalchemy.schema import CreateTable
 
def main():
    # Use a dummy postgresql engine to compile DDL offline
    engine = create_engine('postgresql://')
    sql_statements = []
    
    # Sort tables by dependency order (foreign keys resolved first)
    for table in Base.metadata.sorted_tables:
        ddl = CreateTable(table, if_not_exists=True).compile(bind=engine)
        sql_statements.append(str(ddl).strip() + ";")
        
    output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "schema.sql")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n\n".join(sql_statements))
        
    print(f"Schema SQL successfully generated at: {output_path}")
 
if __name__ == "__main__":
    main()
