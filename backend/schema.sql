CREATE TABLE IF NOT EXISTS material_type_master (
	id UUID NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	description TEXT, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS po_status_master (
	id UUID NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	description TEXT, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS procurement_source_master (
	id UUID NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	description TEXT, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS store_master (
	store_id UUID NOT NULL, 
	store_name VARCHAR(150) NOT NULL, 
	location VARCHAR(200), 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (store_id)
);

CREATE TABLE IF NOT EXISTS vendor_master (
	vendor_id UUID NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	contact_person VARCHAR(150), 
	phone VARCHAR(20), 
	email VARCHAR(255), 
	gst_number VARCHAR(30), 
	address_line1 VARCHAR(255), 
	city VARCHAR(100), 
	state VARCHAR(100), 
	payment_terms VARCHAR(100), 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (vendor_id), 
	UNIQUE (gst_number)
);

CREATE TABLE IF NOT EXISTS rm_master (
	rm_id UUID NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	part_no VARCHAR(100), 
	unit_of_measurement VARCHAR(50) NOT NULL, 
	description TEXT, 
	material_type_id UUID, 
	procurement_source_id UUID, 
	minimum_stock NUMERIC(14, 3), 
	lead_time_days INTEGER, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (rm_id), 
	UNIQUE (part_no), 
	FOREIGN KEY(material_type_id) REFERENCES material_type_master (id), 
	FOREIGN KEY(procurement_source_id) REFERENCES procurement_source_master (id)
);

CREATE TABLE IF NOT EXISTS rm_purchase_order (
	po_id UUID NOT NULL, 
	po_number VARCHAR(50), 
	vendor_id UUID, 
	order_date DATE NOT NULL, 
	expected_delivery_date DATE, 
	status_id UUID, 
	total_amount NUMERIC(14, 2), 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (po_id), 
	UNIQUE (po_number), 
	FOREIGN KEY(vendor_id) REFERENCES vendor_master (vendor_id), 
	FOREIGN KEY(status_id) REFERENCES po_status_master (id)
);

CREATE TABLE IF NOT EXISTS rm_consumption_log (
	consumption_id UUID NOT NULL, 
	rm_id UUID NOT NULL, 
	store_id UUID NOT NULL, 
	qty_used NUMERIC(14, 3) NOT NULL, 
	consumption_type VARCHAR(50) NOT NULL, 
	consumed_date DATE NOT NULL, 
	description TEXT, 
	remarks TEXT, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (consumption_id), 
	FOREIGN KEY(rm_id) REFERENCES rm_master (rm_id), 
	FOREIGN KEY(store_id) REFERENCES store_master (store_id)
);

CREATE TABLE IF NOT EXISTS rm_inventory (
	inventory_id UUID NOT NULL, 
	rm_id UUID NOT NULL, 
	store_id UUID NOT NULL, 
	current_qty NUMERIC(14, 3) NOT NULL, 
	reserved_qty NUMERIC(14, 3), 
	in_transit_qty NUMERIC(14, 3), 
	last_updated TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (inventory_id), 
	UNIQUE (rm_id, store_id), 
	FOREIGN KEY(rm_id) REFERENCES rm_master (rm_id), 
	FOREIGN KEY(store_id) REFERENCES store_master (store_id)
);

CREATE TABLE IF NOT EXISTS rm_inventory_log (
	log_id UUID NOT NULL, 
	rm_id UUID NOT NULL, 
	store_id UUID NOT NULL, 
	transaction_type VARCHAR(50) NOT NULL, 
	qty NUMERIC(14, 3) NOT NULL, 
	balance_before NUMERIC(14, 3) NOT NULL, 
	balance_after NUMERIC(14, 3) NOT NULL, 
	reference_type VARCHAR(50), 
	reference_id UUID, 
	remarks TEXT, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (log_id), 
	FOREIGN KEY(rm_id) REFERENCES rm_master (rm_id), 
	FOREIGN KEY(store_id) REFERENCES store_master (store_id)
);

CREATE TABLE IF NOT EXISTS rm_purchase_order_detail (
	po_detail_id UUID NOT NULL, 
	po_id UUID NOT NULL, 
	rm_id UUID NOT NULL, 
	order_qty NUMERIC(14, 3) NOT NULL, 
	received_qty NUMERIC(14, 3), 
	unit_price NUMERIC(14, 2) NOT NULL, 
	gst_percent NUMERIC(5, 2), 
	line_amount NUMERIC(14, 2), 
	line_status VARCHAR(30), 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (po_detail_id), 
	FOREIGN KEY(po_id) REFERENCES rm_purchase_order (po_id), 
	FOREIGN KEY(rm_id) REFERENCES rm_master (rm_id)
);

CREATE TABLE IF NOT EXISTS rm_receiving_log (
	grn_id UUID NOT NULL, 
	grn_number VARCHAR(50), 
	po_id UUID, 
	vendor_id UUID, 
	received_date DATE NOT NULL, 
	vehicle_number VARCHAR(50), 
	grn_status VARCHAR(30), 
	remarks TEXT, 
	created_at TIMESTAMP WITH TIME ZONE, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (grn_id), 
	UNIQUE (grn_number), 
	FOREIGN KEY(po_id) REFERENCES rm_purchase_order (po_id), 
	FOREIGN KEY(vendor_id) REFERENCES vendor_master (vendor_id)
);

CREATE TABLE IF NOT EXISTS rm_store_mapping (
	mapping_id UUID NOT NULL, 
	rm_id UUID NOT NULL, 
	store_id UUID NOT NULL, 
	min_stock_level NUMERIC(14, 3), 
	max_stock_level NUMERIC(14, 3), 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (mapping_id), 
	UNIQUE (rm_id, store_id), 
	FOREIGN KEY(rm_id) REFERENCES rm_master (rm_id), 
	FOREIGN KEY(store_id) REFERENCES store_master (store_id)
);

CREATE TABLE IF NOT EXISTS rm_vendor_mapping (
	mapping_id UUID NOT NULL, 
	rm_id UUID NOT NULL, 
	vendor_id UUID NOT NULL, 
	standard_cost NUMERIC(14, 2), 
	is_active BOOLEAN NOT NULL, 
	description TEXT, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (mapping_id), 
	UNIQUE (rm_id, vendor_id), 
	FOREIGN KEY(rm_id) REFERENCES rm_master (rm_id), 
	FOREIGN KEY(vendor_id) REFERENCES vendor_master (vendor_id)
);

CREATE TABLE IF NOT EXISTS grn_detail (
	grn_detail_id UUID NOT NULL, 
	grn_id UUID, 
	po_detail_id UUID, 
	rm_id UUID, 
	received_qty NUMERIC(14, 3) NOT NULL, 
	accepted_qty NUMERIC(14, 3), 
	rejected_qty NUMERIC(14, 3), 
	rejection_reason TEXT, 
	store_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (grn_detail_id), 
	FOREIGN KEY(grn_id) REFERENCES rm_receiving_log (grn_id), 
	FOREIGN KEY(po_detail_id) REFERENCES rm_purchase_order_detail (po_detail_id), 
	FOREIGN KEY(rm_id) REFERENCES rm_master (rm_id), 
	FOREIGN KEY(store_id) REFERENCES store_master (store_id)
);