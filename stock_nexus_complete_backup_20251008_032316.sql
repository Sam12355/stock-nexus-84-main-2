--
-- PostgreSQL database dump
--

\restrict DyAfGb4RLa58iXLUUWSS7b9smpZ0TX84Sfx9vYzRuwEWmvZnmXFcsaqd2gJJR4W

-- Dumped from database version 16.10 (Homebrew)
-- Dumped by pg_dump version 16.10 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: log_user_activity(uuid, character varying, jsonb, inet, text); Type: FUNCTION; Schema: public; Owner: khalifainternationalaward
--

CREATE FUNCTION public.log_user_activity(p_user_id uuid, p_action character varying, p_details jsonb DEFAULT '{}'::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent)
    VALUES (p_user_id, p_action, p_details, p_ip_address, p_user_agent);
END;
$$;


ALTER FUNCTION public.log_user_activity(p_user_id uuid, p_action character varying, p_details jsonb, p_ip_address inet, p_user_agent text) OWNER TO khalifainternationalaward;

--
-- Name: update_stock_quantity(uuid, character varying, integer, text, uuid); Type: FUNCTION; Schema: public; Owner: khalifainternationalaward
--

CREATE FUNCTION public.update_stock_quantity(p_item_id uuid, p_movement_type character varying, p_quantity integer, p_reason text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid) RETURNS TABLE(new_quantity integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_qty INTEGER;
    new_qty INTEGER;
BEGIN
    -- Get current quantity
    SELECT current_quantity INTO current_qty FROM stock WHERE item_id = p_item_id;
    
    IF current_qty IS NULL THEN
        current_qty := 0;
    END IF;
    
    -- Calculate new quantity
    IF p_movement_type = 'in' THEN
        new_qty := current_qty + p_quantity;
    ELSIF p_movement_type = 'out' THEN
        new_qty := current_qty - p_quantity;
        IF new_qty < 0 THEN
            RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', current_qty, p_quantity;
        END IF;
    END IF;
    
    -- Update stock
    INSERT INTO stock (item_id, current_quantity, updated_by)
    VALUES (p_item_id, new_qty, p_user_id)
    ON CONFLICT (item_id) 
    DO UPDATE SET 
        current_quantity = new_qty,
        updated_by = p_user_id,
        last_updated = NOW(),
        updated_at = NOW();
    
    -- Log movement
    INSERT INTO stock_movements (item_id, movement_type, quantity, reason, created_by)
    VALUES (p_item_id, p_movement_type, p_quantity, p_reason, p_user_id);
    
    -- Log activity
    PERFORM log_user_activity(
        p_user_id,
        'stock_' || p_movement_type,
        json_build_object(
            'item_id', p_item_id,
            'quantity', p_quantity,
            'old_quantity', current_qty,
            'new_quantity', new_qty,
            'reason', p_reason
        )
    );
    
    RETURN QUERY SELECT new_qty;
END;
$$;


ALTER FUNCTION public.update_stock_quantity(p_item_id uuid, p_movement_type character varying, p_quantity integer, p_reason text, p_user_id uuid) OWNER TO khalifainternationalaward;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: khalifainternationalaward
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO khalifainternationalaward;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: khalifainternationalaward
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    branch_id uuid,
    action character varying(100) NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    entity_type character varying(50),
    entity_id uuid,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.activity_logs OWNER TO khalifainternationalaward;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: khalifainternationalaward
--

CREATE TABLE public.branches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    district_id uuid,
    address text,
    phone character varying(20),
    email character varying(100),
    manager_name character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.branches OWNER TO khalifainternationalaward;

--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: khalifainternationalaward
--

CREATE TABLE public.calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    event_date date NOT NULL,
    event_type character varying(50) DEFAULT 'general'::character varying,
    branch_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.calendar_events OWNER TO khalifainternationalaward;

--
-- Name: districts; Type: TABLE; Schema: public; Owner: khalifainternationalaward
--

CREATE TABLE public.districts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    region_id uuid,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.districts OWNER TO khalifainternationalaward;

--
-- Name: items; Type: TABLE; Schema: public; Owner: khalifainternationalaward
--

CREATE TABLE public.items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50) NOT NULL,
    description text,
    image_url text,
    storage_temperature numeric(5,2),
    threshold_level integer DEFAULT 10 NOT NULL,
    branch_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    low_level integer DEFAULT 5,
    critical_level integer DEFAULT 2,
    CONSTRAINT items_category_check CHECK (((category)::text = ANY ((ARRAY['fish_frozen'::character varying, 'vegetables'::character varying, 'other_frozen_food'::character varying, 'meat_frozen'::character varying, 'kitchen_supplies'::character varying, 'grains'::character varying, 'fruits'::character varying, 'flour'::character varying, 'cleaning_supplies'::character varying, 'canned_prepared_food'::character varying, 'beer_non_alc'::character varying, 'sy_product_recipes'::character varying, 'packaging'::character varying, 'sauce'::character varying, 'softdrinks'::character varying, 'spices'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.items OWNER TO khalifainternationalaward;

--
-- Name: moveout_lists; Type: TABLE; Schema: public; Owner: khalifainternationalaward
--

CREATE TABLE public.moveout_lists (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_by uuid,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    title character varying(255) DEFAULT 'Moveout List'::character varying,
    description text,
    generated_by uuid,
    branch_id uuid,
    CONSTRAINT moveout_lists_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.moveout_lists OWNER TO khalifainternationalaward;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: khalifainternationalaward
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    type character varying(50) NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO khalifainternationalaward;

--
-- Name: regions; Type: TABLE; Schema: public; Owner: khalifainternationalaward
--

CREATE TABLE public.regions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.regions OWNER TO khalifainternationalaward;

--
-- Name: stock; Type: TABLE; Schema: public; Owner: khalifainternationalaward
--

CREATE TABLE public.stock (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    item_id uuid,
    current_quantity integer DEFAULT 0 NOT NULL,
    last_updated timestamp with time zone DEFAULT now(),
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.stock OWNER TO khalifainternationalaward;

--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: khalifainternationalaward
--

CREATE TABLE public.stock_movements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    item_id uuid,
    movement_type character varying(10) NOT NULL,
    quantity integer NOT NULL,
    reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_movements_movement_type_check CHECK (((movement_type)::text = ANY ((ARRAY['in'::character varying, 'out'::character varying])::text[])))
);


ALTER TABLE public.stock_movements OWNER TO khalifainternationalaward;

--
-- Name: stock_receipts; Type: TABLE; Schema: public; Owner: khalifainternationalaward
--

CREATE TABLE public.stock_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_name character varying(255) NOT NULL,
    receipt_file_path character varying(500) NOT NULL,
    receipt_file_name character varying(255) NOT NULL,
    remarks text,
    status character varying(50) DEFAULT 'pending'::character varying,
    submitted_by uuid,
    reviewed_by uuid,
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    CONSTRAINT stock_receipts_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.stock_receipts OWNER TO khalifainternationalaward;

--
-- Name: TABLE stock_receipts; Type: COMMENT; Schema: public; Owner: khalifainternationalaward
--

COMMENT ON TABLE public.stock_receipts IS 'Stores stock receipt submissions from staff for manager review';


--
-- Name: users; Type: TABLE; Schema: public; Owner: khalifainternationalaward
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    phone character varying(20),
    photo_url text,
    "position" character varying(100),
    role character varying(50) NOT NULL,
    branch_id uuid,
    branch_context uuid,
    last_access timestamp with time zone,
    access_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    region_id uuid,
    district_id uuid,
    notification_settings jsonb DEFAULT '{}'::jsonb,
    stock_alert_frequency character varying(50),
    stock_alert_schedule_day character varying(20),
    stock_alert_schedule_date integer,
    stock_alert_schedule_time time without time zone,
    stock_alert_frequencies jsonb DEFAULT '[]'::jsonb,
    event_reminder_frequencies jsonb DEFAULT '[]'::jsonb,
    daily_schedule_time time without time zone,
    weekly_schedule_day character varying(20),
    weekly_schedule_time time without time zone,
    monthly_schedule_date integer,
    monthly_schedule_time time without time zone,
    event_daily_schedule_time time without time zone,
    event_weekly_schedule_day character varying(20),
    event_weekly_schedule_time time without time zone,
    event_monthly_schedule_date integer,
    event_monthly_schedule_time time without time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'manager'::character varying, 'assistant_manager'::character varying, 'staff'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO khalifainternationalaward;

--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: khalifainternationalaward
--

COPY public.activity_logs (id, user_id, branch_id, action, details, entity_type, entity_id, ip_address, user_agent, created_at) FROM stdin;
026557bb-41a6-4631-82b7-2034d933c96e	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_login	{"email": "admin@stocknexus.com"}	\N	\N	::1	curl/8.7.1	2025-10-03 23:31:13.426696+02
fc1055ce-eb89-48cb-bafc-9be3d918f569	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_login	{"email": "admin@stocknexus.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:31:36.989435+02
9c998196-0cff-4567-bb99-b129d96b9bc7	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_login	{"email": "admin@stocknexus.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:31:45.315402+02
e25f815c-3e79-4ffc-8351-f33891bb5d3e	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_login	{"email": "admin@stocknexus.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:32:46.057711+02
af32f709-cfd8-4231-b886-4b4945614e73	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_login	{"email": "admin@stocknexus.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:33:11.09321+02
761df67a-04bf-41ca-8e6b-b9d9b1b26412	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	curl/8.7.1	2025-10-03 23:35:09.510123+02
f89e2de1-7a4a-434d-819b-1b447b3af78d	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_login	{"email": "slaksh7@gmail.com"}	\N	\N	::1	curl/8.7.1	2025-10-03 23:35:11.67893+02
c84987ea-32c5-4da5-a6a8-81899c438bb3	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	curl/8.7.1	2025-10-03 23:35:13.926169+02
89b8aea9-f176-4ca3-9238-28c6414efc95	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_logout	{"email": "admin@stocknexus.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:35:33.722918+02
13d8118f-298c-4c70-94d4-af491d78eaf2	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_login	{"email": "slaksh7@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:36:13.0097+02
431f1e2e-27b8-4b51-be75-84b244e43374	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_logout	{"email": "slaksh7@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:39:20.91655+02
780d9ce3-0ccb-4b1f-8b97-af99933bd5f8	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_login	{"email": "admin@stocknexus.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:39:39.146833+02
81497d78-bbb3-406a-b413-849fc04f754c	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_logout	{"email": "admin@stocknexus.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:41:54.39564+02
a1a656bf-d691-4ed1-90c7-237ce69287be	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_login	{"email": "admin@stocknexus.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:43:43.156057+02
51a727a3-ada6-48cc-bf01-62fefab342f5	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_logout	{"email": "admin@stocknexus.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:45:50.940462+02
e089f822-72cf-4454-b1d5-6f22f9d957e0	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_login	{"email": "admin@stocknexus.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:46:19.496702+02
d32c2704-cc9e-42f1-8c25-472bcad1b20f	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_logout	{"email": "admin@stocknexus.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:52:42.004566+02
fd6aff11-1f33-4039-b590-d351c96ea1e6	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:52:46.084858+02
06f16e08-ab3a-49a1-bf45-d2e7f387fdc7	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-03 23:55:25.850631+02
f7fad99c-75a7-4cc3-b0ba-2f2618a4c4e5	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	item_created	{"name": "Surami", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0"}	\N	\N	\N	\N	2025-10-04 00:01:17.944293+02
f09076a6-2dfa-4d14-b441-11dd55fbe8c1	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	item_updated	{"name": "Surami", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0"}	\N	\N	\N	\N	2025-10-04 00:01:56.334841+02
e40b70a1-9296-4bdc-81a4-bdd11c7d3ca5	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock in", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 10, "new_quantity": 10, "movement_type": "in", "previous_quantity": 0}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:02:06.479204+02
8022decd-44e0-4aa8-84a0-fffb1bc91281	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:02:10.938921+02
6c564658-fd0a-4706-a219-ad40716443da	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:02:12.815988+02
636ef414-e0cf-4d23-9650-972654c9315e	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 1, "new_quantity": 9, "movement_type": "out", "previous_quantity": 10}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:02:58.900255+02
42c900ee-6ecf-41ca-ae3e-93455d3ed89b	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	staff_deleted	{"staff_id": "3edce773-cadd-43f2-ad49-5dc72a2c80a4"}	\N	\N	\N	\N	2025-10-04 00:03:16.976469+02
bdacf14e-af14-4c28-82f6-a8644423684c	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	staff_created	{"name": "Kaumadi Mihirika", "role": "staff", "staff_id": "3edce773-cadd-43f2-ad49-5dc72a2c80a4"}	\N	\N	\N	\N	2025-10-04 00:03:38.66061+02
d63d6896-b4fd-473b-9546-fd7156cd2659	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:03:57.83884+02
8d92aaa2-477c-4e3f-aca1-12223bed799e	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:03:59.900448+02
634d6ee7-a12e-46b2-9714-2bc54f162c30	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:24:06.674531+02
c3825185-db00-4c02-8681-aa781a7d639e	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_login	{"email": "slaksh7@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15	2025-10-04 00:28:03.631455+02
92e2718b-eee1-477b-a6fa-e38bb595b430	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_login	{"email": "slaksh7@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15	2025-10-04 00:29:08.488083+02
763a1526-eefb-4e56-98c4-ed19eee80127	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:39:05.450328+02
e77bfd76-b6dc-4ee0-8d29-debfc2da50e1	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_login	{"email": "slaksh7@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:39:09.586098+02
c2dd27b6-3929-4166-ae31-4ef7658023c1	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_logout	{"email": "slaksh7@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:41:49.327497+02
71c58a9d-747a-4c8b-8627-bd841ae4f84f	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:41:52.927622+02
b4d5b3cf-ba72-4974-83d0-9bb6ae5ce361	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:42:18.280043+02
ed252c9f-c7c3-4813-ba3c-2826c9168213	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:42:21.770412+02
9b5eb554-f98c-4a37-90d2-9ae9bebf222e	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock in", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 10, "new_quantity": 10, "movement_type": "in", "previous_quantity": 0}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:42:28.291618+02
13576bc0-0ea2-4f90-ad63-513b29c1cfb1	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:42:30.663989+02
89d5a238-0299-463b-bb61-0cd0f4c39b11	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_login	{"email": "slaksh7@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:42:35.338121+02
12d7c52a-5382-48be-8726-17fdf439f349	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_logout	{"email": "slaksh7@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:42:54.682061+02
eb47841c-9a95-4d56-99a7-ccd1a36e475e	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:42:58.074748+02
a5bc5f96-651a-41a8-b198-9c81d2c02232	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:43:13.584545+02
8c9ae2c3-14d7-49e6-8fe7-f9eaef5e7879	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:43:49.794393+02
de0ade48-1535-420f-a53f-af4d1dde08b3	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_login	{"email": "slaksh7@gmail.com"}	\N	\N	::1	curl/8.7.1	2025-10-04 00:50:16.738919+02
59831c67-17fa-41cf-a231-91c07d30c2f3	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_login	{"email": "slaksh7@gmail.com"}	\N	\N	::1	curl/8.7.1	2025-10-04 00:50:19.377842+02
1a397af6-a57d-40b5-9275-081d4deb2e64	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_login	{"email": "slaksh7@gmail.com"}	\N	\N	::1	curl/8.7.1	2025-10-04 00:50:40.837808+02
9672a66d-f337-4935-905a-59d53ed8b9d7	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_login	{"email": "slaksh7@gmail.com"}	\N	\N	::1	curl/8.7.1	2025-10-04 00:50:43.578209+02
634dd4f1-4d91-49e8-a4ea-94442e2f5caa	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:54:08.692937+02
cf461b9c-417c-41fb-b653-f0a38b072335	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-04 00:54:12.958622+02
141d6770-5c14-4c70-a958-5a1e64046415	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_logout	{"email": "slaksh7@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15	2025-10-04 00:54:30.42388+02
c10ff1e6-4655-45f5-ba08-5db732e9c384	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15	2025-10-04 00:54:45.715258+02
1eeb8419-d77c-486f-bc2a-033ed6f6bc54	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-06 22:23:00.872693+02
f1aea30a-234b-4482-8218-e5e5f4dbda60	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-06 22:58:22.374403+02
5a4ec9cc-9bd5-405c-a3ef-fbf3e4b99d5a	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_login	{"email": "admin@stocknexus.com"}	\N	\N	::1	curl/8.7.1	2025-10-06 22:59:27.476488+02
c9ecfe7b-780a-496c-99a1-c998ae80a026	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_login	{"email": "admin@stocknexus.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-06 23:00:34.134813+02
fc5665c0-cbd7-4b1d-a9c1-4d7ade0b6f3c	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_logout	{"email": "admin@stocknexus.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-06 23:08:27.324695+02
b138b681-c8bb-4e83-9c63-476fb28f1e0f	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-06 23:08:31.549222+02
036780d4-11ce-4702-b885-15b5a84ac5de	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	staff_created	{"name": "Lakshqn", "role": "staff", "staff_id": "33a7cfe4-65e8-49a4-aaca-9ad4f6847d04"}	\N	\N	\N	\N	2025-10-07 01:04:47.562891+02
b07647b9-9840-4ab4-9384-7a68f0e0effd	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	staff_updated	{"role": "staff", "staff_id": "33a7cfe4-65e8-49a4-aaca-9ad4f6847d04"}	\N	\N	\N	\N	2025-10-07 01:05:56.724815+02
74859549-6b43-4680-813f-10f7d3636867	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	item_created	{"name": "Mob", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6"}	\N	\N	\N	\N	2025-10-07 01:08:21.059704+02
71cab134-4d56-4a6d-bfcb-b16c41790608	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	item_updated	{"name": "Mob", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6"}	\N	\N	\N	\N	2025-10-07 01:09:02.704043+02
4e036aa1-70ea-4604-ae50-f826f4550a9b	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock in", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "quantity": 12, "new_quantity": 12, "movement_type": "in", "previous_quantity": 0}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 01:09:53.243189+02
07046a51-ff39-4fbd-84c1-a43cc4e872a2	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "e8b383a4-147b-4e69-9bc9-19d4a048d32b", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 11:50:35.749227+02
80fae548-fd0c-49c2-aa54-da6664e3e5d8	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "quantity": 5, "new_quantity": 7, "movement_type": "out", "previous_quantity": 12}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 01:10:11.295215+02
863d91da-b2f2-4f5f-9951-c9711e95dfdf	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "quantity": 4, "new_quantity": 3, "movement_type": "out", "previous_quantity": 7}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 01:10:41.535678+02
69104b79-ef74-4d24-8a37-2905e6dd0323	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "quantity": 1, "new_quantity": 2, "movement_type": "out", "previous_quantity": 3}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 01:12:33.613698+02
a0e6b71b-fbd5-4a91-8be5-96a7e645672e	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_login	{"email": "admin@stocknexus.com"}	\N	\N	::1	curl/8.7.1	2025-10-07 01:22:23.091854+02
9dec74ae-b5f6-4a53-b16e-034cf07ce5ee	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_login	{"email": "admin@stocknexus.com"}	\N	\N	::1	curl/8.7.1	2025-10-07 01:22:31.996799+02
6c15f766-99a4-48c0-b932-1d7ca22c4d0d	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_login	{"email": "admin@stocknexus.com"}	\N	\N	::1	curl/8.7.1	2025-10-07 01:22:38.905492+02
7e44653d-259e-47bf-b92f-bd7fc812dcc8	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "quantity": 1, "new_quantity": 0, "movement_type": "out", "previous_quantity": 1}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 01:23:28.743703+02
f12c5ed6-fcf8-4c8c-8465-30c63c332f8f	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock in", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "quantity": 6, "new_quantity": 6, "movement_type": "in", "previous_quantity": 0}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 01:29:40.352618+02
dc928af1-5c98-4057-868a-05b0e4acc1bb	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "quantity": 1, "new_quantity": 5, "movement_type": "out", "previous_quantity": 6}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 01:29:56.534591+02
c26cff32-0080-4c6b-b3b4-91bfdea018c9	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "quantity": 1, "new_quantity": 4, "movement_type": "out", "previous_quantity": 5}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 01:30:23.220294+02
7cf26a99-e445-4dd6-acc5-69f430f619b8	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 02:02:22.277355+02
cf18d2f1-ae32-4d5b-9704-7452cd998efe	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 02:02:34.317477+02
9fe339bd-899d-4175-9ce8-3d1c398a11f6	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 02:32:17.890513+02
e36a269e-be17-4e64-a1dc-d5de90922f86	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "5c49f2af-1508-4537-89f9-68e60b2746b5", "item_count": 1}	\N	\N	\N	\N	2025-10-07 02:35:07.927441+02
f74fa8d0-6c01-482d-bf92-d1b0429c7032	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "fb079967-9682-4817-bb99-c6304b093c0d", "item_count": 1}	\N	\N	\N	\N	2025-10-07 02:37:43.590267+02
b7f75c5f-33ef-42f8-b1be-9f930b7a487d	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "b3380eec-4217-4a44-bb0a-c71a2ddfdc68", "item_count": 1}	\N	\N	\N	\N	2025-10-07 02:40:02.848244+02
3a782c97-d554-4c7b-9294-8b1f9dc06600	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 02:40:26.507523+02
6e909959-ec51-43d4-8f8f-437f50d8af66	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 02:40:28.907894+02
977c66e3-2940-4a1c-9555-395fcd4aef2f	7c6fc959-5e6e-4b57-ad76-66abb86a16ab	\N	user_login	{"email": "admin@stocknexus.com"}	\N	\N	::1	curl/8.7.1	2025-10-07 02:41:48.67126+02
347868bd-28eb-4d61-892d-47954ccf94ab	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	curl/8.7.1	2025-10-07 02:42:04.514988+02
d2678bfc-7876-4995-a17b-288f459ecc58	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "77f3a986-e8a0-4f66-b36c-cb6e29b76a7f", "item_count": 1}	\N	\N	\N	\N	2025-10-07 02:43:31.508428+02
7df98ad8-5a34-4815-b964-b11070a82596	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	curl/8.7.1	2025-10-07 02:44:20.105869+02
2f72044f-9a58-41c4-a4d7-fb66bbb9be3b	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 02:45:29.249189+02
8f429561-425c-4082-a534-a206f98e08ee	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "1ea7fa9b-d70f-42e8-90b1-e79038c5de8a", "item_count": 1}	\N	\N	\N	\N	2025-10-07 02:45:58.79185+02
3b27f563-135c-4914-95d1-b86c64d75b6f	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	curl/8.7.1	2025-10-07 02:47:52.411186+02
3cccdf77-24cb-4255-bf84-17aca8103187	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 02:48:33.722146+02
1c811451-b7a1-44a4-9e12-9bc95020feff	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	curl/8.7.1	2025-10-07 02:50:16.557261+02
efb46ac2-aef8-4462-a7d3-e6379cbf94ac	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 02:53:01.417449+02
644d9148-b76c-4835-99ce-a358ed7e8d47	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "c9d04845-e542-49f6-9ffe-c3f425608b8c", "item_count": 1}	\N	\N	\N	\N	2025-10-07 02:53:19.347302+02
27053526-de7c-4bbc-b0ef-4b624ea15085	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "e8b383a4-147b-4e69-9bc9-19d4a048d32b", "item_count": 1}	\N	\N	\N	\N	2025-10-07 03:01:34.740042+02
7706870d-5651-4b59-9c8b-1e5857fea098	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 03:05:10.729008+02
684dfd41-b29b-40d1-9c9a-2f5163311154	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "e8b383a4-147b-4e69-9bc9-19d4a048d32b", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 11:50:47.580031+02
f6af3ece-1b95-4dde-a5e8-cd8c24ddb470	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "ce0d4f12-e6ed-41ff-9e95-fdf8a06c29c4", "item_count": 1}	\N	\N	\N	\N	2025-10-07 11:51:45.775043+02
d7198b65-1485-4c44-856b-a235a598c074	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 12:19:26.290634+02
719bb13c-4e90-466f-a6cd-3a1affb700ff	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 12:20:04.741697+02
865ac55b-c686-438a-8336-231995a02a9d	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "list_id": "ce0d4f12-e6ed-41ff-9e95-fdf8a06c29c4", "quantity": 1, "item_name": "Surami", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:20:10.495575+02
5bb70182-9654-45ca-b57b-61e0937721e3	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "list_id": "ce0d4f12-e6ed-41ff-9e95-fdf8a06c29c4", "quantity": 1, "item_name": "Surami", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:20:13.602697+02
4f927a6c-0237-4a9a-ab55-8c3be34ce074	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "list_id": "ce0d4f12-e6ed-41ff-9e95-fdf8a06c29c4", "quantity": 1, "item_name": "Surami", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:20:16.043558+02
b11e88e5-fa5d-43d2-8bd0-c675b8a23bf0	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "list_id": "ce0d4f12-e6ed-41ff-9e95-fdf8a06c29c4", "quantity": 1, "item_name": "Surami", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:20:18.495513+02
d9e1a088-95cf-4744-8a16-247ec4f9cf05	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "list_id": "ce0d4f12-e6ed-41ff-9e95-fdf8a06c29c4", "quantity": 1, "item_name": "Surami", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:20:23.712483+02
3898e3f4-5528-40c7-9a41-b76496d68d2f	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "77f3a986-e8a0-4f66-b36c-cb6e29b76a7f", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:21:09.236905+02
7333e5f4-76f5-4301-8e46-c90875113af7	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "5e2ecb69-0bbc-43d7-bd2f-76982b81a43d", "item_count": 1}	\N	\N	\N	\N	2025-10-07 12:21:41.853589+02
6500b490-fa97-4350-8095-5368023115d6	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "5e2ecb69-0bbc-43d7-bd2f-76982b81a43d", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:21:46.725003+02
716b97cb-9535-4ee2-adef-5e0e86e6fb34	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "5e2ecb69-0bbc-43d7-bd2f-76982b81a43d", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:21:57.411107+02
8a60ebb0-b758-4f0d-aa26-2a0d0eb48c17	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "5e2ecb69-0bbc-43d7-bd2f-76982b81a43d", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:22:21.015279+02
80d7488c-bca7-4c0b-a7a4-8aa4aefddef5	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "5e2ecb69-0bbc-43d7-bd2f-76982b81a43d", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:22:37.334264+02
9149d09d-163b-430f-861a-769c679a0375	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "5e2ecb69-0bbc-43d7-bd2f-76982b81a43d", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:22:52.711377+02
18f3f367-3424-4a6f-a070-e1c4969ecaf1	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "5e2ecb69-0bbc-43d7-bd2f-76982b81a43d", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:24:09.910313+02
e999fc25-c902-42ee-b7f5-ada482719f99	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "5e2ecb69-0bbc-43d7-bd2f-76982b81a43d", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:24:28.701161+02
c0c99a48-898c-4b81-9e4d-db1ada41e844	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "3cf91466-65a6-44ad-94af-4f128e2f5b82", "item_count": 1}	\N	\N	\N	\N	2025-10-07 12:29:35.404607+02
86d598b3-403d-4efc-b100-7a7848d8eea7	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "3cf91466-65a6-44ad-94af-4f128e2f5b82", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:29:39.663892+02
2cd955fb-23f5-4aa6-a354-a06dadd54379	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "22052eac-c905-4e57-a90a-f0bf30a3018b", "item_count": 1}	\N	\N	\N	\N	2025-10-07 12:37:57.9951+02
218ecdd2-0809-49f3-ad7f-0791f77dd9ac	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "22052eac-c905-4e57-a90a-f0bf30a3018b", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 12:38:02.643408+02
dd82b75f-8127-43a5-8a65-9b3c3c271407	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "8a5b37c6-7a8b-4788-940a-93d193027d29", "quantity": 1, "item_name": "Mob", "processed_by": "Test User"}	\N	\N	\N	\N	2025-10-07 12:40:58.258571+02
b34723b4-6a46-4cd9-9c7c-68eebb73a895	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "7ab1fa06-5883-42c6-9ecf-b9bd1ff4953d", "item_count": 1}	\N	\N	\N	\N	2025-10-07 13:28:40.582195+02
8b87f5da-c034-44dd-a080-e1754ad99b02	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "7ab1fa06-5883-42c6-9ecf-b9bd1ff4953d", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 13:28:47.511978+02
b11612b1-7012-4632-859b-bfaaf8e10e9c	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "760ee263-27f8-425a-855b-d00f91006fde", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 13:42:41.704381+02
23947256-1c71-4839-913a-5c81f901bcff	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "760ee263-27f8-425a-855b-d00f91006fde", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 13:42:47.201371+02
43c841f0-1324-40a1-a153-f5b7d19d7457	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "760ee263-27f8-425a-855b-d00f91006fde", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 13:42:57.162235+02
56bdc957-21c0-4a64-a4c3-366d66d3fdcf	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "760ee263-27f8-425a-855b-d00f91006fde", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 13:43:00.626915+02
5de72227-51d5-4abd-8d90-c7145b7e4f05	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "da6675dd-8eff-4fd7-af8c-ae40159894c8", "item_count": 1}	\N	\N	\N	\N	2025-10-07 13:50:48.400871+02
6520ad64-59fb-442e-8644-09ff5914feda	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "list_id": "da6675dd-8eff-4fd7-af8c-ae40159894c8", "quantity": 2, "item_name": "Surami", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 13:50:59.772399+02
d9c3edde-0ea0-4761-9a68-7f377aa7f57e	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 13:58:14.616536+02
c69f3883-e9ca-4058-a016-db65502be275	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 13:58:32.08584+02
ca3bfd23-25f4-41dc-8159-352e9c0256e4	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock in", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "quantity": 12, "new_quantity": 11, "movement_type": "in", "previous_quantity": -1}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 13:58:52.906665+02
f3b44d0d-2350-4be1-ae7d-05eb67893da6	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 13:58:55.114259+02
abb7b1ba-7e94-408d-ac78-964b41b2c257	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 13:58:58.412359+02
a51e7126-6bfa-43d0-bc5b-9c294d05d66d	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "18bcd41b-91ef-446c-9a1f-f83ee8a341cd", "item_count": 2}	\N	\N	\N	\N	2025-10-07 13:59:23.481354+02
bbab29ce-6bfd-47cc-906b-82fe4a53c035	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "18bcd41b-91ef-446c-9a1f-f83ee8a341cd", "quantity": 2, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 13:59:30.240328+02
c0441520-622e-44a7-b218-2682b1bce107	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 13:59:34.380171+02
fdb96211-9129-4015-9ba0-fe62f2a4b764	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 13:59:37.330016+02
28f367da-e300-41b8-9d4a-f0e6a60e2320	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 13:59:44.362581+02
c8450d21-305e-45fb-a864-a2c4b0dfe741	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_login	{"email": "slaksh7@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 13:59:49.609822+02
416b70fd-9cd7-4284-bdb2-b0477c47c605	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	moveout_item_processed	{"item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "list_id": "18bcd41b-91ef-446c-9a1f-f83ee8a341cd", "quantity": 2, "item_name": "Surami", "processed_by": "S Laksh"}	\N	\N	\N	\N	2025-10-07 14:18:43.78266+02
b2071c49-73cb-486c-8ebf-741ec9542d52	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	moveout_list_generated	{"list_id": "1d17bc80-84e8-45fd-a41c-57975dba55c3", "item_count": 2}	\N	\N	\N	\N	2025-10-07 14:20:09.345481+02
0932a245-9680-42bb-9c2e-267c7859a201	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_logout	{"email": "slaksh7@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 14:20:20.231453+02
70821ad8-e5b3-411f-8e84-66f762644cc9	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 14:20:26.323813+02
64951af6-ecd7-48dc-97ce-f29d246ef5fb	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "list_id": "1d17bc80-84e8-45fd-a41c-57975dba55c3", "quantity": 1, "item_name": "Surami", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 14:20:39.607774+02
37242eee-183f-4cc8-8507-191a1a961e90	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "1d17bc80-84e8-45fd-a41c-57975dba55c3", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 14:20:46.295742+02
8a1bfac4-d06b-4c54-a042-52a46b78a02d	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "e2577f2f-9a9a-460d-b88e-1a8d309942af", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 14:27:11.370028+02
b7a0486d-30c4-4ff3-9313-f67572e6da05	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "558c21de-2100-4ba2-b0d7-88fccce8e729", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 14:34:59.964826+02
2ecfa178-2cea-4635-a899-07c0d6d118e5	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15	2025-10-07 14:35:27.159602+02
a4b3c555-f713-455f-a2b0-701254dadd1f	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15	2025-10-07 14:35:30.88302+02
e70d6392-a42d-46f6-93f1-7deb9ae2124b	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "ec98895f-9f90-499a-9f8f-3407443f5aeb", "item_count": 1}	\N	\N	\N	\N	2025-10-07 14:35:57.570074+02
548f0d16-3b11-4101-9520-914bea1e233f	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "ec98895f-9f90-499a-9f8f-3407443f5aeb", "quantity": 2, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 14:36:18.488254+02
90d3170a-f19e-4d45-bb4a-2c1543e0b4de	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15	2025-10-07 14:36:29.742506+02
37d85f14-ef2f-48cf-b49a-80b85f41d33f	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15	2025-10-07 14:36:32.590808+02
7c8ba8c1-b5d9-4ea6-9dd2-03bd3923a42e	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "05b0fa5c-686e-45f2-acb4-05c5f0f28308", "item_count": 1}	\N	\N	\N	\N	2025-10-07 14:36:55.00704+02
9900bbce-e859-45c9-bc99-7f4547227625	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "05b0fa5c-686e-45f2-acb4-05c5f0f28308", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 14:36:58.567721+02
159b7f0d-12e2-4866-9fc8-0f7b298f8996	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "quantity": 1, "new_quantity": 2, "movement_type": "out", "previous_quantity": 3}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15	2025-10-07 14:38:34.56187+02
3900c096-d2d3-471f-8c15-2d987c2e6143	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "388b0ae6-8696-4fd8-b2a4-579abd762cd7", "item_count": 1}	\N	\N	\N	\N	2025-10-07 14:47:28.810534+02
7539a1ae-a439-4f8d-be7c-d96e2a7adbf6	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "388b0ae6-8696-4fd8-b2a4-579abd762cd7", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 14:47:33.490209+02
e105bb9e-c592-4aee-8987-e7c29d4b72d3	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "29513712-ce20-4cb6-bf6f-6f0038717662", "quantity": 2, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 14:52:49.89623+02
9b04370e-d06b-443d-b816-bd9b2330d9df	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "91dc676e-1044-4af1-9bff-35c88f00cb10", "item_count": 1}	\N	\N	\N	\N	2025-10-07 14:53:49.569474+02
821fd5ae-bef2-41b2-9d2f-375fe23175de	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "91dc676e-1044-4af1-9bff-35c88f00cb10", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 14:53:53.948243+02
23a5e244-eca8-46ec-a493-ca0602303824	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "cbe4692c-2f08-4c16-83e7-4418e507b5ef", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 15:03:14.451501+02
47af7f5a-6362-43d7-bffe-3c1e2efdbef5	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock in", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "quantity": 10, "new_quantity": 10, "movement_type": "in", "previous_quantity": 0}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15	2025-10-07 15:04:26.279573+02
1431ccef-5142-419c-8d0c-11c956a72183	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock in", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 9, "new_quantity": 10, "movement_type": "in", "previous_quantity": 1}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15	2025-10-07 15:04:32.318655+02
2857daac-bd19-4a27-ab27-0171e838af01	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "b4de10b4-21fb-4be8-899e-37021e4b9f82", "item_count": 1}	\N	\N	\N	\N	2025-10-07 15:05:02.664016+02
587ebdcd-228a-490f-92fe-4c67d5b4babe	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "list_id": "b4de10b4-21fb-4be8-899e-37021e4b9f82", "quantity": 5, "item_name": "Surami", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 15:05:06.516492+02
83af741b-2b72-44e6-9144-262a6b41c365	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "7fd2cb94-d539-4f06-a561-214c19514cc0", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 15:15:01.337475+02
651dd7c0-df92-4210-98df-9040c83acdf6	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "e0632c15-0f06-414b-bc69-b4975cc34d5d", "item_count": 1}	\N	\N	\N	\N	2025-10-07 15:15:50.316317+02
1af88050-778c-4696-94e9-ddba1d85638c	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "fa41bbd0-1b2a-4560-97a8-a3ca4a788839", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 15:21:06.51908+02
5935d456-0ee0-45af-a23b-b4091863737c	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "list_id": "e0632c15-0f06-414b-bc69-b4975cc34d5d", "quantity": 2, "item_name": "Surami", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 15:21:12.548572+02
11d241be-9033-4aad-a1c2-48a7d50ed795	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "1bb32d46-bc99-4539-b175-fced214df4e0", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 15:24:11.041875+02
391a6b3b-ebc6-4dc9-a8ea-6df471e760eb	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 1, "new_quantity": 2, "movement_type": "out", "previous_quantity": 3}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0.1 Safari/605.1.15	2025-10-07 15:24:54.859574+02
1a4bc49a-d1cc-4c45-8c99-17452f62100f	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "e44d9069-266c-45c5-afe0-05db43d1e442", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 21:55:15.320574+02
96b5a9d7-5d42-4863-89ce-344961a0e3fa	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "edf42273-7119-42d0-af8f-38c2efcaab56", "item_count": 1}	\N	\N	\N	\N	2025-10-07 21:55:54.989312+02
43698f57-a718-440b-84fd-2946b2d926a7	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "list_id": "edf42273-7119-42d0-af8f-38c2efcaab56", "quantity": 1, "item_name": "Surami", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 21:56:06.223329+02
13920a8d-28fe-4ae9-844b-eeed033b86c7	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "05e4c577-de34-4d63-97f9-34a8a0f06ac6", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 22:01:09.543833+02
922a0b89-9a83-43d1-a756-1b0cfa153dcc	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 22:21:14.814008+02
962cfa51-4178-4f61-8bef-35432329da92	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "51e8fb76-da9a-48ea-beae-9b1831839421", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 22:21:23.806085+02
f2d17fbf-d9c3-4679-a0ba-db93e4cd2920	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 22:21:59.508327+02
ea6079a4-aecb-4647-a0b6-8274c3b2c3e8	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "1708386a-4adf-4fb5-b882-03c351b444a8", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 22:37:01.642019+02
62634f15-b5c5-4f12-b8f4-9a861bf3d4cb	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "3348a84c-d734-4851-a26c-e7f8c4299081", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 22:44:12.632472+02
66cb15b3-fc58-4a2a-a74c-3b63f22eeea1	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "list_id": "a5b32ec6-b87b-49ab-8fc0-3563bc39967a", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 23:01:59.558711+02
9c6e4f1a-91c6-4f68-a8c2-824ad593c81c	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:02:52.050858+02
89074607-823d-45f3-a566-63cfaad577c5	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:02:55.657258+02
a168abde-1a3c-4fba-b18c-918f08ff1257	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:03:01.826931+02
80aa9b11-d3f2-4780-979a-af228af31e92	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_login	{"email": "slaksh7@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:03:08.395375+02
565102e9-fee7-472a-b0ef-51e2fd5eceda	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	moveout_list_generated	{"list_id": "80ac2284-a597-43d3-9da2-1210b76a337e", "item_count": 1}	\N	\N	\N	\N	2025-10-07 23:03:26.918826+02
fecfc878-c4a4-4509-871e-fe63e13bc2bd	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:07:27.475941+02
e28ff43b-2942-4105-8b43-9d487ce6a648	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:07:35.14054+02
cfae7988-2496-4040-abfe-e8225cc29e2d	572c001e-2c97-40c1-8276-c73a0bb6572f	\N	user_logout	{"email": "slaksh7@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:03:28.492063+02
bdfffeb2-464d-4595-8871-a0e19fa68b3c	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:03:33.331749+02
0759be21-46b9-4968-a814-e5b7c4115962	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_item_processed	{"item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "list_id": "80ac2284-a597-43d3-9da2-1210b76a337e", "quantity": 1, "item_name": "Surami", "processed_by": "Kaumadi Mihirika"}	\N	\N	\N	\N	2025-10-07 23:03:38.301455+02
28fe8602-4fc6-44f1-a257-0f45be022edd	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:08:37.516269+02
450af12e-878d-4300-ab79-fdae50389b57	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:08:39.297953+02
b08354fd-37c6-4c83-82c1-5fcd1dfdae5f	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock in", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 10, "new_quantity": 10, "movement_type": "in", "previous_quantity": 0}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:08:45.467911+02
88d71c4d-6692-4ca5-8d39-105dd1a0b491	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:08:47.845998+02
34d5cc1e-39cc-4839-b8e3-9cd77c6ede07	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:08:52.75669+02
6e4dd393-fc21-4c6e-a565-0740adca5fc3	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	moveout_list_generated	{"list_id": "c1c95e66-2e43-4338-ad2c-a5cc59bf2e7e", "item_count": 1}	\N	\N	\N	\N	2025-10-07 23:09:02.594595+02
457d7075-65ce-46f2-9120-891ad484ebfd	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:09:03.742167+02
db6198ab-c8a9-4a1f-b28a-d763db873bd2	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:09:06.439819+02
3fc4a30f-3a36-486f-a111-fb3411eb8e58	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	moveout_item_processed	{"item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "list_id": "c1c95e66-2e43-4338-ad2c-a5cc59bf2e7e", "quantity": 3, "item_name": "Surami", "processed_by": "Jaber Ahmed"}	\N	\N	\N	\N	2025-10-07 23:09:16.469043+02
79a4f404-6485-49bd-8619-1b9b7414bf8f	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:18:41.128254+02
81ee9ccf-dae6-44e9-bad5-50740b0b0d7e	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:18:44.37893+02
c2ed6633-3cd8-48fd-a765-bfc1167b43c1	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:18:48.617834+02
be47738a-85ff-40c9-a442-eebc09501453	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:18:51.084063+02
a125cc15-c78b-4780-8ba7-72a48858b715	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:28:04.376914+02
b0b1e982-eb3a-4a60-905d-1610f1508b68	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:28:07.224056+02
4e582255-ba7a-4535-a16e-6c957e0b4ff9	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:28:11.365118+02
07f9132b-0136-4e6c-a6f5-a8db7f3cdf7d	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:28:14.823859+02
8d41b033-b87e-4274-bf72-14b8fd3d2551	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	moveout_list_generated	{"list_id": "0b8f71b3-975c-4647-b427-ccf45ea7eb73", "item_count": 1}	\N	\N	\N	\N	2025-10-07 23:32:46.569748+02
312890c4-94dc-4ae3-95eb-c277aa6c9b7d	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	moveout_item_processed	{"item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "list_id": "0b8f71b3-975c-4647-b427-ccf45ea7eb73", "quantity": 2, "item_name": "Surami", "processed_by": "Jaber Ahmed"}	\N	\N	\N	\N	2025-10-07 23:32:51.439664+02
db6e8d91-cf51-4550-bd22-c83ddcc4489e	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 00:19:13.793932+02
324bef17-1e86-495b-a4e2-0d0311343152	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 00:19:16.379861+02
86946ac4-6baa-4719-b55c-dd4b8cd7357d	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 00:19:19.868033+02
bb017eae-c79d-4095-8aa5-1469479d472f	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 00:19:23.114686+02
4b7cf2ba-31bb-441a-8700-0192c5b78aeb	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 01:22:47.926587+02
76fd7007-d5df-4223-bcb8-9f8b7602468e	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 2, "new_quantity": 3, "movement_type": "out", "previous_quantity": 5}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 01:23:12.732311+02
085de939-fd99-40df-88ce-f376330cfb3e	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 1, "new_quantity": 2, "movement_type": "out", "previous_quantity": 3}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 01:24:25.683051+02
79284d3f-1914-4ca4-ae32-d0a35e5cd903	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 1, "new_quantity": 1, "movement_type": "out", "previous_quantity": 2}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 01:25:12.056776+02
36d221cb-a331-4576-aefa-5de39cf8c21c	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 1, "new_quantity": 0, "movement_type": "out", "previous_quantity": 1}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 01:25:44.303278+02
b702d45c-6320-4878-819a-71ba3d69f76d	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock in", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 3, "new_quantity": 3, "movement_type": "in", "previous_quantity": 0}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 01:26:14.238905+02
44a2c5c5-d012-4130-8ba5-5e5bcd136e53	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 1, "new_quantity": 2, "movement_type": "out", "previous_quantity": 3}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 01:26:32.798853+02
57782902-be4c-4f43-9afb-3945fd9b0a35	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 1, "new_quantity": 1, "movement_type": "out", "previous_quantity": 2}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 01:32:57.754899+02
8e3b67dc-cc92-4b5f-a160-57eb04ac4a05	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 02:57:38.796169+02
e807348b-50d1-4189-a39b-9dd810ba520f	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 1, "new_quantity": 0, "movement_type": "out", "previous_quantity": 1}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 02:57:50.127856+02
4d192fa0-b8cf-4d14-810d-cee3dbb7c66b	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 03:21:27.184296+02
302f29cd-ad77-44f0-962e-c3755db89d85	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_logout	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 03:21:34.969712+02
6875c2e7-e200-4985-a116-b2a6d22a5d90	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_login	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 03:21:38.06971+02
dcc41945-ada0-49f7-80e0-e265c5c4bd22	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	user_logout	{"email": "kaumadi19910119@gmail.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 03:21:44.836087+02
d49e4408-c103-4dc8-a883-df2c9d6a1a16	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	user_login	{"email": "aa@aa.com"}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 03:21:47.676337+02
ae5e1131-d1a8-4df9-a8a1-f255ad3474a7	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock in", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 10, "new_quantity": 10, "movement_type": "in", "previous_quantity": 0}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 03:21:55.406885+02
6ee327b0-0903-4935-84a5-3dd63ac64471	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	\N	stock_movement	{"reason": "Quick stock out", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "quantity": 7, "new_quantity": 3, "movement_type": "out", "previous_quantity": 10}	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 03:22:03.844139+02
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: khalifainternationalaward
--

COPY public.branches (id, name, district_id, address, phone, email, manager_name, created_at, updated_at) FROM stdin;
e3204bd8-ac3d-413f-bd7b-2727e9c7f598	Main Branch	5995e063-ae11-414b-add9-1e79d44e107b	Vaxjo, Sweden	+1234567890	main@company.com	Jaber Ahmed	2025-10-03 23:55:37.13693+02	2025-10-06 23:09:30.632458+02
bb6313ee-0513-4805-81c2-3072e9618640	Secondary Branch	5995e063-ae11-414b-add9-1e79d44e107b	Vaxjo, Sweden	+1234567891	secondary@company.com	S Laksh	2025-10-03 23:55:37.139845+02	2025-10-06 23:09:30.632458+02
\.


--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: khalifainternationalaward
--

COPY public.calendar_events (id, title, description, event_date, event_type, branch_id, created_by, created_at, updated_at) FROM stdin;
a7077716-c0ec-426c-b892-109aa910c84a	cbcb	\N	2025-10-10	delivery	e3204bd8-ac3d-413f-bd7b-2727e9c7f598	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-04 01:25:47.876148+02	2025-10-04 01:25:47.876148+02
12ac9560-626e-4437-bd29-c4b8a8543f44	oo	hh	2025-10-07	delivery	e3204bd8-ac3d-413f-bd7b-2727e9c7f598	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 01:02:38.377224+02	2025-10-07 01:02:38.377224+02
\.


--
-- Data for Name: districts; Type: TABLE DATA; Schema: public; Owner: khalifainternationalaward
--

COPY public.districts (id, name, region_id, description, created_at, updated_at) FROM stdin;
5995e063-ae11-414b-add9-1e79d44e107b	Main District	c33dc2c6-297e-482e-8987-de0f188642bd	Primary district	2025-10-03 23:55:37.132965+02	2025-10-03 23:55:37.132965+02
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: khalifainternationalaward
--

COPY public.items (id, name, category, description, image_url, storage_temperature, threshold_level, branch_id, created_by, created_at, updated_at, low_level, critical_level) FROM stdin;
9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	Surami	fish_frozen	dafafafa	data:image/png;base64,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6QW9uztc3dzYOaBqT5IkFObnobigACVFRci7mY2Uq/FIuRqP5PgryE5Ps1eUMiGkx0IvJ2+21wWJKsIOgIpGBzZ+UUDiul+imqFQSNKk0CvJu9UOQgRwFYCqLmfnHg3y8cwAcD+4MRNRNSalC5MYERqfHK52EqLbeNNRWWhc0qcC0hAA19XOQkQ28atOpwsOjU/6Te0gRH/FDoADCI1LDjeivBMADg0SVR8SJGnFDc96fbdFJySoHYbo7zgHwIEsBjSnWgS8DIHXJcBJ7TxEJFuaSZJm7LqSvEftIEQVYQfAAY1q7t9Ko9F8AmC42lmIyCImQNrkpJMWbo1OyVI7DFFl2AFwYCGBjccA0qcAWOuXyPGdNglpzq7LySfUDkJkDq4CcGCx2bmxjb1812o1JqMG6AjAVe1MRHSHy0LguW5xSXPXZOcpXi+YyFY4AlBFjA3yrWUyuT0OSXoJCmwtTERWi4Ik3i8ISNx8+DAMaochshQ7AFXMpLZ1PYrL9E8A0uOQ0EHtPEQ1jBHAPiHh865XknYsBkxqByKSix2AKmxMYOO2EjAJMM0ARBO18xBVVxLwOyA2SAbN+l0JCalq5yFSAjsA1cAkQFvYMqCPRhKDIUmDIRAMwFntXERV2E0A4ZIkHdRodftDYxOi1Q5EpDR2AKqhMQ0busFN29cEdBOQWgMiSABBEuCpdjYiB3RdQMRIkhQDjYg2GaWj7vFJZ7bcGu4nqrbYAahBxjZr5mfUGBsBxtpCaD2EkDxMJlFLaExekqTh/wtUbWkglUmSVCAJTY5GMhWYtKJAwJSnEaXxO2Iy89XOR0RERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERE5GD+D5B5reqpsdrfAAAAAElFTkSuQmCC	-18.00	10	e3204bd8-ac3d-413f-bd7b-2727e9c7f598	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-04 00:01:17.932188+02	2025-10-04 00:01:56.330214+02	5	2
e74d99e6-f785-4d0c-8a09-5c38eaac99e6	Mob	cleaning_supplies	for cleanimg	\N	15.00	10	e3204bd8-ac3d-413f-bd7b-2727e9c7f598	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 01:08:21.052611+02	2025-10-07 01:09:02.699754+02	5	2
\.


--
-- Data for Name: moveout_lists; Type: TABLE DATA; Schema: public; Owner: khalifainternationalaward
--

COPY public.moveout_lists (id, created_by, items, status, created_at, updated_at, title, description, generated_by, branch_id) FROM stdin;
e44d9069-266c-45c5-afe0-05db43d1e442	3edce773-cadd-43f2-ad49-5dc72a2c80a4	[{"status": "completed", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "category": "General", "item_name": "Mob", "processed_at": "2025-10-07T19:55:15.320Z", "processed_by": "Kaumadi Mihirika", "request_amount": 1, "available_amount": 1, "processed_quantity": 1}]	completed	2025-10-07 15:29:06.113146+02	2025-10-07 21:55:15.368016+02	Debug Test Real-time	Test list to debug real-time notification updates	\N	\N
b4de10b4-21fb-4be8-899e-37021e4b9f82	3edce773-cadd-43f2-ad49-5dc72a2c80a4	[{"status": "completed", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "category": "General", "item_name": "Surami", "processed_at": "2025-10-07T13:05:06.515Z", "processed_by": "Kaumadi Mihirika", "request_amount": 5, "available_amount": 10, "processed_quantity": 5}]	completed	2025-10-07 15:05:02.664016+02	2025-10-07 15:05:06.519553+02	Moveout List - 10/7/2025	Generated by Kaumadi Mihirika	\N	\N
7fd2cb94-d539-4f06-a561-214c19514cc0	3edce773-cadd-43f2-ad49-5dc72a2c80a4	[{"status": "completed", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "category": "General", "item_name": "Mob", "processed_at": "2025-10-07T13:15:01.337Z", "processed_by": "Kaumadi Mihirika", "request_amount": 1, "available_amount": 1, "processed_quantity": 1}]	completed	2025-10-07 15:10:33.62724+02	2025-10-07 15:15:01.349836+02	Comprehensive Notification Test	Test list to verify real-time notification updates work from all sources	\N	\N
51e8fb76-da9a-48ea-beae-9b1831839421	3edce773-cadd-43f2-ad49-5dc72a2c80a4	[{"status": "completed", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "category": "General", "item_name": "Mob", "processed_at": "2025-10-07T20:21:23.805Z", "processed_by": "Kaumadi Mihirika", "request_amount": 1, "available_amount": 1, "processed_quantity": 1}]	completed	2025-10-07 22:07:29.702924+02	2025-10-07 22:21:23.816166+02	FINAL Test Real-time	Final test to verify IMMEDIATE real-time notification updates work	\N	\N
fa41bbd0-1b2a-4560-97a8-a3ca4a788839	3edce773-cadd-43f2-ad49-5dc72a2c80a4	[{"status": "completed", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "category": "General", "item_name": "Mob", "processed_at": "2025-10-07T13:21:06.518Z", "processed_by": "Kaumadi Mihirika", "request_amount": 1, "available_amount": 1, "processed_quantity": 1}]	completed	2025-10-07 15:19:47.807045+02	2025-10-07 15:21:06.529211+02	Socket.IO Real-time Test	Test list to verify Socket.IO real-time notification updates work	\N	\N
edf42273-7119-42d0-af8f-38c2efcaab56	3edce773-cadd-43f2-ad49-5dc72a2c80a4	[{"status": "completed", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "category": "General", "item_name": "Surami", "processed_at": "2025-10-07T19:56:06.222Z", "processed_by": "Kaumadi Mihirika", "request_amount": 1, "available_amount": 2, "processed_quantity": 1}]	completed	2025-10-07 21:55:54.989312+02	2025-10-07 21:56:06.235833+02	Moveout List - 10/7/2025	Generated by Kaumadi Mihirika	\N	\N
e0632c15-0f06-414b-bc69-b4975cc34d5d	3edce773-cadd-43f2-ad49-5dc72a2c80a4	[{"status": "completed", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "category": "General", "item_name": "Surami", "processed_at": "2025-10-07T13:21:12.548Z", "processed_by": "Kaumadi Mihirika", "request_amount": 2, "available_amount": 5, "processed_quantity": 2}]	completed	2025-10-07 15:15:50.316317+02	2025-10-07 15:21:12.556755+02	Moveout List - 10/7/2025	Generated by Kaumadi Mihirika	\N	\N
1bb32d46-bc99-4539-b175-fced214df4e0	3edce773-cadd-43f2-ad49-5dc72a2c80a4	[{"status": "completed", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "category": "General", "item_name": "Mob", "processed_at": "2025-10-07T13:24:11.041Z", "processed_by": "Kaumadi Mihirika", "request_amount": 1, "available_amount": 1, "processed_quantity": 1}]	completed	2025-10-07 15:23:40.664935+02	2025-10-07 15:24:11.05092+02	CORS Fixed Real-time Test	Test list to verify CORS fix and real-time notification updates work	\N	\N
3348a84c-d734-4851-a26c-e7f8c4299081	3edce773-cadd-43f2-ad49-5dc72a2c80a4	[{"status": "completed", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "category": "General", "item_name": "Mob", "processed_at": "2025-10-07T20:44:12.632Z", "processed_by": "Kaumadi Mihirika", "request_amount": 1, "available_amount": 1, "processed_quantity": 1}]	completed	2025-10-07 22:42:22.22714+02	2025-10-07 22:44:12.643595+02	REAL-TIME TEST	Test to verify real-time notification updates work immediately	\N	\N
1708386a-4adf-4fb5-b882-03c351b444a8	3edce773-cadd-43f2-ad49-5dc72a2c80a4	[{"status": "completed", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "category": "General", "item_name": "Mob", "processed_at": "2025-10-07T20:37:01.641Z", "processed_by": "Kaumadi Mihirika", "request_amount": 1, "available_amount": 1, "processed_quantity": 1}]	completed	2025-10-07 22:06:08.479522+02	2025-10-07 22:37:01.660866+02	FINAL Test Real-time	Final test to verify IMMEDIATE real-time notification updates work	\N	\N
05e4c577-de34-4d63-97f9-34a8a0f06ac6	3edce773-cadd-43f2-ad49-5dc72a2c80a4	[{"status": "completed", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "category": "General", "item_name": "Mob", "processed_at": "2025-10-07T20:01:09.543Z", "processed_by": "Kaumadi Mihirika", "request_amount": 1, "available_amount": 1, "processed_quantity": 1}]	completed	2025-10-07 22:00:00.828653+02	2025-10-07 22:01:09.557121+02	IMMEDIATE Test Real-time	Test list to verify IMMEDIATE real-time notification updates work	\N	\N
a5b32ec6-b87b-49ab-8fc0-3563bc39967a	3edce773-cadd-43f2-ad49-5dc72a2c80a4	[{"status": "completed", "item_id": "e74d99e6-f785-4d0c-8a09-5c38eaac99e6", "category": "General", "item_name": "Mob", "processed_at": "2025-10-07T21:01:59.558Z", "processed_by": "Kaumadi Mihirika", "request_amount": 1, "available_amount": 1, "processed_quantity": 1}]	completed	2025-10-07 22:47:14.08542+02	2025-10-07 23:01:59.573413+02	🚀 IMMEDIATE NOTIFICATION TEST	Test to verify notifications appear IMMEDIATELY	\N	\N
80ac2284-a597-43d3-9da2-1210b76a337e	572c001e-2c97-40c1-8276-c73a0bb6572f	[{"status": "completed", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "category": "General", "item_name": "Surami", "processed_at": "2025-10-07T21:03:38.301Z", "processed_by": "Kaumadi Mihirika", "request_amount": 1, "available_amount": 1, "processed_quantity": 1}]	completed	2025-10-07 23:03:26.918826+02	2025-10-07 23:03:38.310198+02	Moveout List - 10/7/2025	Generated by S Laksh	\N	\N
c1c95e66-2e43-4338-ad2c-a5cc59bf2e7e	3edce773-cadd-43f2-ad49-5dc72a2c80a4	[{"status": "completed", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "category": "General", "item_name": "Surami", "processed_at": "2025-10-07T21:09:16.468Z", "processed_by": "Jaber Ahmed", "request_amount": 3, "available_amount": 10, "processed_quantity": 3}]	completed	2025-10-07 23:09:02.594595+02	2025-10-07 23:09:16.473725+02	Moveout List - 10/7/2025	Generated by Kaumadi Mihirika	\N	\N
0b8f71b3-975c-4647-b427-ccf45ea7eb73	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	[{"status": "completed", "item_id": "9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0", "category": "General", "item_name": "Surami", "processed_at": "2025-10-07T21:32:51.439Z", "processed_by": "Jaber Ahmed", "request_amount": 2, "available_amount": 7, "processed_quantity": 2}]	completed	2025-10-07 23:32:46.569748+02	2025-10-07 23:32:51.448055+02	Moveout List - 10/7/2025	Generated by Jaber Ahmed	\N	\N
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: khalifainternationalaward
--

COPY public.notifications (id, user_id, title, message, type, data, is_read, created_at) FROM stdin;
fe889d4c-2b39-4ce9-a692-abd833feb624	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - THRESHOLD LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 9\n🎯 Threshold: 10\n📱 Alert Type: THRESHOLD\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/4/2025, 12:02:58 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "threshold", "current_quantity": 9}	f	2025-10-04 00:02:58.941542+02
d2886c40-17b9-486c-bc2d-5cdc0b892d39	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - THRESHOLD LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 6\n🎯 Threshold: 10\n📱 Alert Type: THRESHOLD\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/4/2025, 12:24:31 AM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "threshold", "current_quantity": 6}	f	2025-10-04 00:24:31.688074+02
957ef040-6ab3-489b-b62f-ac5e1a72e912	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 4\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/4/2025, 12:24:49 AM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 4}	f	2025-10-04 00:24:49.101076+02
8bf119c3-6ceb-460e-a20e-a2a5d6aa2d3a	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/4/2025, 12:24:55 AM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 3}	f	2025-10-04 00:24:55.698797+02
0da20431-22f6-41b9-9450-862213796ffc	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/4/2025, 12:25:01 AM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	f	2025-10-04 00:25:01.250968+02
f0557315-32f3-47d9-8d2f-3634e5d2e968	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/4/2025, 12:35:57 AM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-04 00:35:57.265086+02
ae319caf-7670-414e-87e2-a1937a485543	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/4/2025, 12:36:02 AM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-04 00:36:02.382458+02
4e788fb4-9116-4479-b55c-1c95a04debc1	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - THRESHOLD LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 9\n🎯 Threshold: 10\n📱 Alert Type: THRESHOLD\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/4/2025, 12:42:42 AM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "threshold", "current_quantity": 9}	f	2025-10-04 00:42:42.641724+02
e86a2140-0e1d-46d2-9e56-d8504d29ee40	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	📉 STOCK ALERT - THRESHOLD LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 9\n🎯 Threshold: 10\n📱 Alert Type: THRESHOLD\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/4/2025, 12:42:48 AM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "threshold", "current_quantity": 9}	f	2025-10-04 00:42:48.558361+02
4e53d18c-245a-41fb-b76c-89c805fa07e8	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - THRESHOLD LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 6\n🎯 Threshold: 10\n📱 Alert Type: THRESHOLD\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/4/2025, 12:51:31 AM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "threshold", "current_quantity": 6}	f	2025-10-04 00:51:31.98803+02
33b7f7c9-8412-4746-bc1e-408251f31e28	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	📉 STOCK ALERT - THRESHOLD LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 6\n🎯 Threshold: 10\n📱 Alert Type: THRESHOLD\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/4/2025, 12:51:38 AM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "threshold", "current_quantity": 6}	f	2025-10-04 00:51:38.506896+02
6da86197-4283-4049-b55e-7f2004e944e9	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	📉 STOCK ALERT - THRESHOLD LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 7\n🎯 Threshold: 10\n📱 Alert Type: THRESHOLD\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 1:10:11 AM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "threshold", "current_quantity": 7}	f	2025-10-07 01:10:11.355239+02
db7c49c0-0c7b-44fa-beaf-d0656311969d	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	📉 STOCK ALERT - THRESHOLD LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 7\n🎯 Threshold: 10\n📱 Alert Type: THRESHOLD\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 1:10:30 AM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "threshold", "current_quantity": 7}	f	2025-10-07 01:10:30.427811+02
db655a18-b73f-405e-8c1e-9707b97d4ee8	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 1:10:41 AM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "low", "current_quantity": 3}	f	2025-10-07 01:10:41.543649+02
17d4950e-a3f4-4e3d-ba3a-5a2f6c8e2c80	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 1:10:46 AM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "low", "current_quantity": 3}	f	2025-10-07 01:10:46.988212+02
f39f8970-94c5-479e-9f85-0c21fcf04a3c	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 2\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 1:12:33 AM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 2}	f	2025-10-07 01:12:33.623842+02
b2d9182e-a881-4346-a193-398d8b6af36b	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 2\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 1:12:37 AM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 2}	f	2025-10-07 01:12:37.943922+02
4c19b5c8-1b49-4c2e-a5c0-19fd7a11aa56	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 1:23:28 AM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 01:23:28.785369+02
5e709a84-1061-48e4-a9f3-b3118c7dd6ac	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 1:23:44 AM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 01:23:44.144877+02
727f0caa-ee1b-4cfb-a3fb-6730872dabbb	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 5\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 1:29:56 AM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "low", "current_quantity": 5}	f	2025-10-07 01:29:56.57613+02
d54354d7-cd0f-4304-8282-86b71a7fc458	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 5\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 1:30:16 AM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "low", "current_quantity": 5}	f	2025-10-07 01:30:16.716506+02
5872aec8-d603-4df4-9949-2501cb949da6	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 4\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 1:30:23 AM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "low", "current_quantity": 4}	f	2025-10-07 01:30:23.229642+02
31a2325a-65f9-49c3-8604-6c77d70c940c	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 4\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 1:30:28 AM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "low", "current_quantity": 4}	f	2025-10-07 01:30:28.103573+02
a1b01be2-e8fc-4fc5-97a3-ac0da45ef872	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "5c49f2af-1508-4537-89f9-68e60b2746b5"}	f	2025-10-07 02:35:07.941047+02
899f02b1-6835-4594-99d9-069452b3ba14	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "fb079967-9682-4817-bb99-c6304b093c0d"}	f	2025-10-07 02:37:43.598745+02
d0d6e877-941c-48b2-8477-8285d8a67d4b	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "b3380eec-4217-4a44-bb0a-c71a2ddfdc68"}	f	2025-10-07 02:40:02.857423+02
ba9ccd7a-e370-4a5f-adf7-6683c1dc0ce4	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "77f3a986-e8a0-4f66-b36c-cb6e29b76a7f"}	f	2025-10-07 02:43:31.517819+02
5d364cce-f947-4fc3-83c7-7bd3d69e6f9b	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "1ea7fa9b-d70f-42e8-90b1-e79038c5de8a"}	f	2025-10-07 02:45:58.795726+02
b1dda5bf-7c17-41c1-8bc7-012dbafa8966	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "c9d04845-e542-49f6-9ffe-c3f425608b8c"}	f	2025-10-07 02:53:19.355093+02
011922c4-1cf8-4312-b4d4-6a2b59ed127c	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "e8b383a4-147b-4e69-9bc9-19d4a048d32b"}	f	2025-10-07 03:01:34.750778+02
ef250f75-fa33-4d24-b632-0cfd03e6027c	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "c9d04845-e542-49f6-9ffe-c3f425608b8c"}	t	2025-10-07 02:53:19.353729+02
f42fdaf1-a614-460d-934b-da988e27a931	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "1ea7fa9b-d70f-42e8-90b1-e79038c5de8a"}	t	2025-10-07 02:45:58.797278+02
84de50b4-5499-4b43-986d-0ae8a70de5cb	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "77f3a986-e8a0-4f66-b36c-cb6e29b76a7f"}	t	2025-10-07 02:43:31.519204+02
c7fc8187-37ca-4131-81fd-2fb4a7e3f8fc	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "b3380eec-4217-4a44-bb0a-c71a2ddfdc68"}	t	2025-10-07 02:40:02.858808+02
373ec51e-4219-4624-82b8-ecd61d7de1c9	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "fb079967-9682-4817-bb99-c6304b093c0d"}	t	2025-10-07 02:37:43.599877+02
56e87a62-fdaf-4e09-815e-da36efd9b72c	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "5c49f2af-1508-4537-89f9-68e60b2746b5"}	t	2025-10-07 02:35:07.94312+02
f975433b-6452-4ebe-bffc-bfebcf3d5724	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "ce0d4f12-e6ed-41ff-9e95-fdf8a06c29c4"}	f	2025-10-07 11:51:45.784962+02
aadf53c6-fa4a-484e-912e-843be735ba46	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "5e2ecb69-0bbc-43d7-bd2f-76982b81a43d"}	f	2025-10-07 12:21:41.860612+02
9fab78d4-f9e2-45a7-962d-d125bf0c1bf4	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "3cf91466-65a6-44ad-94af-4f128e2f5b82"}	f	2025-10-07 12:29:35.416231+02
3c857ec2-4fed-423d-af2e-4abad9b58c7c	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "22052eac-c905-4e57-a90a-f0bf30a3018b"}	f	2025-10-07 12:37:58.00473+02
863656a7-e769-43d8-943d-3e2bad46b638	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "7ab1fa06-5883-42c6-9ecf-b9bd1ff4953d"}	f	2025-10-07 13:28:40.594245+02
72dcb700-78af-4a1f-a4bd-a81bb9e3cd46	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 2}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "da6675dd-8eff-4fd7-af8c-ae40159894c8"}	f	2025-10-07 13:50:48.411768+02
fb982578-eccf-489c-a0ce-649d9584481a	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 2 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 2}, {"name": "Surami", "request_amount": 2}], "created_by": "Kaumadi Mihirika", "item_count": 2, "moveout_list_id": "18bcd41b-91ef-446c-9a1f-f83ee8a341cd"}	f	2025-10-07 13:59:23.487835+02
227532e1-3852-4699-a261-d2e5a04f45b0	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	S Laksh has created a new moveout list with 2 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 1}, {"name": "Mob", "request_amount": 1}], "created_by": "S Laksh", "item_count": 2, "moveout_list_id": "1d17bc80-84e8-45fd-a41c-57975dba55c3"}	f	2025-10-07 14:20:09.353046+02
b40859ee-5d3e-41f0-af85-18b92b1cb432	572c001e-2c97-40c1-8276-c73a0bb6572f	New Moveout List Created	S Laksh has created a new moveout list with 2 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 1}, {"name": "Mob", "request_amount": 1}], "created_by": "S Laksh", "item_count": 2, "moveout_list_id": "1d17bc80-84e8-45fd-a41c-57975dba55c3"}	f	2025-10-07 14:20:09.355765+02
bf4a656f-5086-4578-84f0-cde1fb51f0d3	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	S Laksh has created a new moveout list with 2 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 1}, {"name": "Mob", "request_amount": 1}], "created_by": "S Laksh", "item_count": 2, "moveout_list_id": "1d17bc80-84e8-45fd-a41c-57975dba55c3"}	t	2025-10-07 14:20:09.354707+02
c38d8151-b323-429c-8a21-97279bbb799e	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 2 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 2}, {"name": "Surami", "request_amount": 2}], "created_by": "Kaumadi Mihirika", "item_count": 2, "moveout_list_id": "18bcd41b-91ef-446c-9a1f-f83ee8a341cd"}	t	2025-10-07 13:59:23.488933+02
4dcacb7c-8b64-4aa5-8f2b-9a99637ccece	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 2}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "da6675dd-8eff-4fd7-af8c-ae40159894c8"}	t	2025-10-07 13:50:48.41312+02
d33cc59d-3c55-4426-b943-ed430a65dfea	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "7ab1fa06-5883-42c6-9ecf-b9bd1ff4953d"}	t	2025-10-07 13:28:40.595671+02
91f3e846-f9b3-444c-9c36-6a693a3d6c37	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "22052eac-c905-4e57-a90a-f0bf30a3018b"}	t	2025-10-07 12:37:58.006105+02
51b49d03-ec75-4314-954a-e1a2e921cf59	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "3cf91466-65a6-44ad-94af-4f128e2f5b82"}	t	2025-10-07 12:29:35.417812+02
e0d4cae9-0f72-426f-9631-a5ea3b80d40c	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "5e2ecb69-0bbc-43d7-bd2f-76982b81a43d"}	t	2025-10-07 12:21:41.862662+02
45518b99-f6f5-486a-ae91-b37acd28fdd3	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "ce0d4f12-e6ed-41ff-9e95-fdf8a06c29c4"}	t	2025-10-07 11:51:45.782447+02
fdab8289-7f7a-43e0-a6d2-c99506aa8d20	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	📉 STOCK ALERT - THRESHOLD LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 6\n🎯 Threshold: 10\n📱 Alert Type: THRESHOLD\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:35:00 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "threshold", "current_quantity": 6}	f	2025-10-07 14:35:00.019629+02
b968dbe5-15a9-48b9-9ed6-e38924454cc6	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	📉 STOCK ALERT - THRESHOLD LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 6\n🎯 Threshold: 10\n📱 Alert Type: THRESHOLD\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:35:00 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "threshold", "current_quantity": 6}	f	2025-10-07 14:35:00.024415+02
8ecdf21a-e49c-4228-897e-f9f3f3354818	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 2}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "ec98895f-9f90-499a-9f8f-3407443f5aeb"}	f	2025-10-07 14:35:57.577484+02
3622b31b-54e2-4c8a-be3a-afe206ea4a97	572c001e-2c97-40c1-8276-c73a0bb6572f	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 2}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "ec98895f-9f90-499a-9f8f-3407443f5aeb"}	f	2025-10-07 14:35:57.578596+02
12105e50-e8d7-486d-bbe8-eab30eb4421f	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 4\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:36:18 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "low", "current_quantity": 4}	f	2025-10-07 14:36:18.529337+02
2aaf5acb-3f12-44be-b0f8-4d99c23d2d5b	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 4\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:36:18 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "low", "current_quantity": 4}	f	2025-10-07 14:36:18.531122+02
4382c91b-fa18-4971-93c8-ebbf99cec31e	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "05b0fa5c-686e-45f2-acb4-05c5f0f28308"}	f	2025-10-07 14:36:55.013631+02
80716282-77bd-45f9-bc71-895e483dc14f	572c001e-2c97-40c1-8276-c73a0bb6572f	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "05b0fa5c-686e-45f2-acb4-05c5f0f28308"}	f	2025-10-07 14:36:55.015412+02
e2849e5d-ed0a-4b55-a6f7-f381998e96ce	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:36:58 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "low", "current_quantity": 3}	f	2025-10-07 14:36:58.581127+02
38704064-11a0-44cb-a0a5-f74f42c7f827	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:36:58 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "low", "current_quantity": 3}	f	2025-10-07 14:36:58.586526+02
f393d570-36a0-4054-9487-43228ba33076	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 2\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:38:34 PM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 2}	f	2025-10-07 14:38:34.570946+02
74f969f7-49d8-4ba2-8956-743939b2744e	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 2\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:38:39 PM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 2}	f	2025-10-07 14:38:39.723583+02
999ca126-fea1-4e18-a663-026caee589e7	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "388b0ae6-8696-4fd8-b2a4-579abd762cd7"}	f	2025-10-07 14:47:28.820793+02
aab1d443-3e61-4d47-b76d-c1ee7dbd3e65	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:36:58 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "low", "current_quantity": 3}	t	2025-10-07 14:36:58.588449+02
a38378cd-47c7-42bc-9201-edfd56e174e7	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "05b0fa5c-686e-45f2-acb4-05c5f0f28308"}	t	2025-10-07 14:36:55.01669+02
db8d3d0f-9908-4743-983e-7127747eb5dc	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 4\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:36:18 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "low", "current_quantity": 4}	t	2025-10-07 14:36:18.525744+02
ef745044-8570-46c9-9f21-9af86b38d697	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 2}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "ec98895f-9f90-499a-9f8f-3407443f5aeb"}	t	2025-10-07 14:35:57.57949+02
18d085d3-2721-419d-9e0f-50e34fc0c348	572c001e-2c97-40c1-8276-c73a0bb6572f	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "388b0ae6-8696-4fd8-b2a4-579abd762cd7"}	f	2025-10-07 14:47:28.82227+02
4a466f11-a833-428a-9e0c-c0f2f0095f91	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:47:33 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	f	2025-10-07 14:47:33.547908+02
ef4bf099-1ff7-4b2e-b42b-f62225f0a591	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:47:33 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	f	2025-10-07 14:47:33.552057+02
d708d575-6ca6-4619-bdaa-638a7dddf544	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:52:49 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	f	2025-10-07 14:52:49.945013+02
f714dafc-3f9c-4f32-a262-23b78f2314f8	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:52:55 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	f	2025-10-07 14:52:55.787285+02
69198038-6528-4a3e-81e2-bb6e9ed09c8f	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "91dc676e-1044-4af1-9bff-35c88f00cb10"}	f	2025-10-07 14:53:49.574248+02
41ce97e5-f648-42b5-9193-2e7c094d9b1f	572c001e-2c97-40c1-8276-c73a0bb6572f	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "91dc676e-1044-4af1-9bff-35c88f00cb10"}	f	2025-10-07 14:53:49.575158+02
095a55ab-f248-4f80-a880-270c6c6d957e	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:53:53 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 14:53:53.977381+02
117aca64-a4cf-4e8c-845a-2df8b27a5ddc	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:54:01 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 14:54:01.149503+02
9c80a9cc-d882-40d6-a117-1464279be4f3	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:03:14 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 15:03:14.471728+02
dc7803d9-a953-4203-9130-6b52e6610fd0	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:03:21 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 15:03:21.143821+02
c6c5d29b-4c7e-4836-9778-c24869e37c99	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:03:26 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	t	2025-10-07 15:03:26.116764+02
cb525882-2bb7-4d5b-8647-08efa3481977	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:54:05 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	t	2025-10-07 14:54:05.868121+02
d3af5067-df7f-4d80-a09d-12bb284d7b10	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "91dc676e-1044-4af1-9bff-35c88f00cb10"}	t	2025-10-07 14:53:49.576037+02
3225c461-9d1b-41f0-8a5f-8201f646a648	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:53:01 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	t	2025-10-07 14:53:01.089865+02
47177965-4ad8-4dcd-8bd3-543662fa27a6	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:47:33 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	t	2025-10-07 14:47:33.553813+02
6bbf1de5-42b9-4457-8666-37bd761c9459	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "388b0ae6-8696-4fd8-b2a4-579abd762cd7"}	t	2025-10-07 14:47:28.823389+02
5e4e0603-2ba7-4573-968b-e1c668c58f8c	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 5}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "b4de10b4-21fb-4be8-899e-37021e4b9f82"}	f	2025-10-07 15:05:02.668218+02
aef1989e-c098-4729-8b4b-8b4faa2b5318	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 2\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:38:45 PM	stock_alert	{"source": "stock_out", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 2}	t	2025-10-07 14:38:45.046759+02
f93396b0-8959-4fff-8507-b95aa424cdcf	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	📉 STOCK ALERT - THRESHOLD LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 6\n🎯 Threshold: 10\n📱 Alert Type: THRESHOLD\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 2:34:59 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "threshold", "current_quantity": 6}	t	2025-10-07 14:35:00.015016+02
ff16622c-9a1e-4252-a660-c5db26c4a9f9	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Mob", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "e8b383a4-147b-4e69-9bc9-19d4a048d32b"}	t	2025-10-07 03:01:34.74911+02
b622318a-1ffd-4378-865e-3c41a5177b52	572c001e-2c97-40c1-8276-c73a0bb6572f	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 5}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "b4de10b4-21fb-4be8-899e-37021e4b9f82"}	f	2025-10-07 15:05:02.669102+02
8d8d544b-c258-490f-9fc7-ced797f393ec	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 5\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:05:06 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 5}	f	2025-10-07 15:05:06.525817+02
cc45061c-8913-4f32-8fe5-c4e5c33d348c	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 5\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:05:12 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 5}	f	2025-10-07 15:05:12.196932+02
89c9159f-f41e-4c48-93a2-e86c285e03ce	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 5}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "b4de10b4-21fb-4be8-899e-37021e4b9f82"}	t	2025-10-07 15:05:02.670154+02
e59cd940-91a3-472b-b0e0-f8216acc34c8	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:15:01 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 15:15:01.390154+02
d5ea1d03-958a-4be5-80f0-74123528f766	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:15:06 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 15:15:06.442107+02
6cef5eb2-2785-408f-b418-445cd3c0cdff	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 2}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "e0632c15-0f06-414b-bc69-b4975cc34d5d"}	f	2025-10-07 15:15:50.324252+02
7251309f-a16c-4013-93f9-23a14a783bd2	572c001e-2c97-40c1-8276-c73a0bb6572f	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 2}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "e0632c15-0f06-414b-bc69-b4975cc34d5d"}	f	2025-10-07 15:15:50.326174+02
fbade47e-b324-4aad-a9c0-d5185d76336b	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:21:06 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 15:21:06.571948+02
8fb74edb-6459-4ebb-a098-775e67f9df9c	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:21:12 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 3}	f	2025-10-07 15:21:12.57334+02
c9195b94-8e7f-4776-8aba-f5c653cf736a	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:21:12 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 15:21:12.613136+02
c9a9ed07-b2ad-408c-9736-a051fcf07572	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:21:17 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 3}	f	2025-10-07 15:21:17.342997+02
557cf594-6e96-45b4-8fc4-a001a4f44ac0	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:24:11 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 15:24:11.090133+02
4dbbba5f-b802-4fb3-91a9-f13d971cdd14	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:24:16 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 15:24:16.193079+02
32e79129-d3fa-4095-8899-8300ce3c76a5	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 2\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:24:54 PM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 2}	f	2025-10-07 15:24:54.867092+02
d3da8a03-efb3-49d8-9b75-b2452e90b8be	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 2\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:24:59 PM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 2}	f	2025-10-07 15:24:59.646998+02
e4008475-298d-4a6b-b4b3-bfed93e9fddc	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:21:21 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 3}	t	2025-10-07 15:21:21.643631+02
ccc5873f-a78e-423a-b0af-f63e90def44d	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:21:17 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	t	2025-10-07 15:21:17.302603+02
1f0b204d-eb5d-4042-b76f-e8b92e32f668	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 2}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "e0632c15-0f06-414b-bc69-b4975cc34d5d"}	t	2025-10-07 15:15:50.327141+02
57b93d7d-0dd0-49bc-87a0-0694514213cf	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:15:11 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	t	2025-10-07 15:15:11.227238+02
45446325-524c-413d-bac5-b82988254fee	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 5\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:05:16 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 5}	t	2025-10-07 15:05:16.582177+02
2adf07a4-52eb-4c09-8ddd-510bc2349441	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 9:55:15 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 21:55:15.425139+02
1e30f7dd-eae9-4136-80b3-42bf5ac23cfb	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 9:55:21 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 21:55:21.812842+02
5c81d2f9-cc26-4e63-84f4-cfd245cd6c0d	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "edf42273-7119-42d0-af8f-38c2efcaab56"}	f	2025-10-07 21:55:54.99314+02
b7f0cd25-eee6-40e1-b3c7-88c0999bad5b	572c001e-2c97-40c1-8276-c73a0bb6572f	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "edf42273-7119-42d0-af8f-38c2efcaab56"}	f	2025-10-07 21:55:54.995552+02
ea71d74f-570c-40ce-98f1-78f1acd86903	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 9:56:06 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	f	2025-10-07 21:56:06.249503+02
cb948138-2b10-4167-8204-d38a2695a269	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 9:56:11 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	f	2025-10-07 21:56:11.309827+02
3009ba12-993b-4bb0-b7ab-cc8e41c97a92	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 10:01:09 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 22:01:09.599731+02
934f9427-c0a8-4e14-8e2f-70939c5efbf1	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 10:01:14 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 22:01:14.878312+02
0c048c4a-8850-4cf8-a04a-072b92669b17	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 10:21:23 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 22:21:23.87348+02
21a551f8-6182-46c9-92ed-c368cec300f5	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: -1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 10:37:01 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": -1}	f	2025-10-07 22:37:01.71447+02
5ba1bb52-c161-4520-9e60-b8d01dafc9d2	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: -1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 10:37:18 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": -1}	f	2025-10-07 22:37:18.670574+02
3ebd513e-b5ff-4b5c-b7e2-43d1fe19b410	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: -1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 10:37:12 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": -1}	t	2025-10-07 22:37:12.845053+02
b32e992a-a6f9-4b3e-bc66-c6ce7482e3c2	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 10:01:20 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	t	2025-10-07 22:01:20.182006+02
179650ee-e442-4da2-98ed-b435c98e04e1	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 9:56:16 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	t	2025-10-07 21:56:16.310141+02
cfff09e7-6f97-4c30-9c1d-2f7880ee020d	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 1}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "edf42273-7119-42d0-af8f-38c2efcaab56"}	t	2025-10-07 21:55:54.998641+02
85ec67a5-b05f-4ca4-9f0d-65d41154511a	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 9:55:26 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	t	2025-10-07 21:55:26.358971+02
dae87354-619c-4feb-b8e9-236e0d7158ea	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 2\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:25:04 PM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 2}	t	2025-10-07 15:25:04.101721+02
585f3ae4-e893-4c58-b6bf-6d9f73d08723	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 3:24:21 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	t	2025-10-07 15:24:21.01397+02
8b5bebd9-1dd2-4062-8a90-bf8876d676d0	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Test Real-time Notification	This is a test notification to verify real-time updates are working	test	{"test": true, "timestamp": "2025-10-07T20:41:45.265Z"}	f	2025-10-07 22:41:45.29124+02
2060fd18-90f7-44fb-8c6d-01477c840299	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 10:44:12 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 22:44:12.683059+02
aa9a9cfb-033c-4713-ad1b-f636249f2af3	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 10:44:17 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 22:44:17.900435+02
c55bf0f5-c6ce-42cd-88e6-723b1fb1733d	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 10:44:22 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 22:44:22.273157+02
b50fc9db-8c10-47e5-b3d7-2b6e034059a1	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 11:01:59 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 23:01:59.610558+02
f515d4a2-37fd-4942-8754-bce07a08f7a0	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 11:02:06 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 23:02:06.123414+02
359fe689-d087-4a52-b858-15e0810c5d6c	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Mob	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Mob\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 11:02:11 PM	stock_alert	{"source": "moveout_list", "item_name": "Mob", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 23:02:11.360945+02
c7e99475-8ea8-4552-a0cc-b989af8d1ab2	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Item Processed	Mob (1 units) has been deducted from stock	moveout_processed	{"list_id": "a5b32ec6-b87b-49ab-8fc0-3563bc39967a", "quantity": 1, "item_name": "Mob", "processed_by": "Kaumadi Mihirika"}	t	2025-10-07 23:01:59.568758+02
5bfe03a2-6d52-47f1-b6ca-7fc4cff95adf	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Socket.IO Test Notification	This is a test to verify Socket.IO real-time notifications are working	test	{"test": true, "socket_io": true, "timestamp": "2025-10-07T20:45:51.300Z"}	t	2025-10-07 22:45:51.325753+02
fa564389-3107-43a6-9b4d-a4d6537a27ea	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	S Laksh has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 1}], "created_by": "S Laksh", "item_count": 1, "moveout_list_id": "80ac2284-a597-43d3-9da2-1210b76a337e"}	f	2025-10-07 23:03:26.92532+02
803a2760-adcf-46a4-ae2b-6a4602c9d112	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	S Laksh has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 1}], "created_by": "S Laksh", "item_count": 1, "moveout_list_id": "80ac2284-a597-43d3-9da2-1210b76a337e"}	f	2025-10-07 23:03:26.926574+02
c6d8901c-1871-4a96-8667-3bb98bf47063	572c001e-2c97-40c1-8276-c73a0bb6572f	New Moveout List Created	S Laksh has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 1}], "created_by": "S Laksh", "item_count": 1, "moveout_list_id": "80ac2284-a597-43d3-9da2-1210b76a337e"}	f	2025-10-07 23:03:26.927523+02
c4806bb7-dd9f-4ccb-8abc-58e7840729f2	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Item Processed	Surami (1 units) has been deducted from stock	moveout_processed	{"list_id": "80ac2284-a597-43d3-9da2-1210b76a337e", "quantity": 1, "item_name": "Surami", "processed_by": "Kaumadi Mihirika"}	f	2025-10-07 23:03:38.308039+02
f868984d-aa00-4fea-a589-986baebefd9b	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 11:03:38 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 23:03:38.326188+02
a465504b-6b51-45e3-99e2-c4fef9740de4	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 11:03:43 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 23:03:43.830376+02
b0bfef21-cb91-4134-8f91-444d32d072b5	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	🚨 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 11:03:48 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-07 23:03:48.530564+02
c6b1de7c-cc70-411f-a108-13904c6bed3c	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 3}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "c1c95e66-2e43-4338-ad2c-a5cc59bf2e7e"}	f	2025-10-07 23:09:02.600155+02
a3d67db9-cd04-42ae-86ee-ea779b7a6d1f	572c001e-2c97-40c1-8276-c73a0bb6572f	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 3}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "c1c95e66-2e43-4338-ad2c-a5cc59bf2e7e"}	f	2025-10-07 23:09:02.601592+02
dcc52bd0-a5e5-4765-a813-202e96601b6e	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Kaumadi Mihirika has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 3}], "created_by": "Kaumadi Mihirika", "item_count": 1, "moveout_list_id": "c1c95e66-2e43-4338-ad2c-a5cc59bf2e7e"}	f	2025-10-07 23:09:02.602623+02
cc9175ed-49f8-4321-8766-eadcf061e17d	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Item Processed	Surami (3 units) has been deducted from stock	moveout_processed	{"list_id": "c1c95e66-2e43-4338-ad2c-a5cc59bf2e7e", "quantity": 3, "item_name": "Surami", "processed_by": "Jaber Ahmed"}	f	2025-10-07 23:09:16.472088+02
e8836b05-d54a-458f-b630-43da037d37b2	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	📉 STOCK ALERT - THRESHOLD LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 7\n🎯 Threshold: 10\n📱 Alert Type: THRESHOLD\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 11:09:16 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "threshold", "current_quantity": 7}	f	2025-10-07 23:09:16.479073+02
5a070d94-02ad-49b0-a1c7-89892d2c2147	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	📉 STOCK ALERT - THRESHOLD LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 7\n🎯 Threshold: 10\n📱 Alert Type: THRESHOLD\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 11:09:21 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "threshold", "current_quantity": 7}	f	2025-10-07 23:09:21.72793+02
8570df93-36ff-45f9-ba9f-3dab6af239ba	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - THRESHOLD LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 7\n🎯 Threshold: 10\n📱 Alert Type: THRESHOLD\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 11:09:26 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "threshold", "current_quantity": 7}	f	2025-10-07 23:09:26.745777+02
c88bb8a5-9437-49b0-80e9-4444e43baf1a	3edce773-cadd-43f2-ad49-5dc72a2c80a4	New Moveout List Created	Jaber Ahmed has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 2}], "created_by": "Jaber Ahmed", "item_count": 1, "moveout_list_id": "0b8f71b3-975c-4647-b427-ccf45ea7eb73"}	f	2025-10-07 23:32:46.576703+02
febe4fb9-6733-4c52-820d-279ac4ad27e8	33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	New Moveout List Created	Jaber Ahmed has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 2}], "created_by": "Jaber Ahmed", "item_count": 1, "moveout_list_id": "0b8f71b3-975c-4647-b427-ccf45ea7eb73"}	f	2025-10-07 23:32:46.578327+02
3d9bef4d-0ac7-4e98-bdd2-ba7e32764734	572c001e-2c97-40c1-8276-c73a0bb6572f	New Moveout List Created	Jaber Ahmed has created a new moveout list with 1 items. Please review the items that need to be moved out.	moveout_list	{"items": [{"name": "Surami", "request_amount": 2}], "created_by": "Jaber Ahmed", "item_count": 1, "moveout_list_id": "0b8f71b3-975c-4647-b427-ccf45ea7eb73"}	f	2025-10-07 23:32:46.579184+02
396df71a-8186-4d54-985c-73c557864656	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Item Processed	Surami (2 units) has been deducted from stock	moveout_processed	{"list_id": "0b8f71b3-975c-4647-b427-ccf45ea7eb73", "quantity": 2, "item_name": "Surami", "processed_by": "Jaber Ahmed"}	f	2025-10-07 23:32:51.446118+02
3723a017-9e33-41c7-8f3d-be0bc8f5faed	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 5\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 11:32:51 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 5}	f	2025-10-07 23:32:51.462788+02
26509427-e1f3-445e-affa-6be9b1a654f4	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 5\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 11:32:58 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 5}	f	2025-10-07 23:32:58.388192+02
2cbe7fc5-184b-421e-9ee8-0eddc6354e4c	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	⚠️ STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 5\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/7/2025, 11:33:04 PM	stock_alert	{"source": "moveout_list", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 5}	f	2025-10-07 23:33:04.261837+02
e72dc413-fe2f-40fc-9b7a-bd9c6b6407c2	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:23:12 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 3}	f	2025-10-08 01:23:12.771185+02
cddbcfb4-cc3b-4a09-aa28-b0bbe2148e21	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:23:23 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 3}	f	2025-10-08 01:23:23.439277+02
c16f8bcb-112c-4f67-a030-e490b6a6d344	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:23:28 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 3}	f	2025-10-08 01:23:28.720494+02
af156776-07f7-4c48-801f-9219c0c8fd46	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 2\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:24:25 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 2}	f	2025-10-08 01:24:25.69281+02
f8e10e5e-2b86-45b5-94e6-bdc459559732	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 2\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:24:29 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 2}	f	2025-10-08 01:24:29.856887+02
81501cac-c5d1-41ee-8c28-feec21a78bc0	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 2\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:24:35 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 2}	f	2025-10-08 01:24:35.276962+02
a3d43500-898e-4d57-b283-6db6d7057d82	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:25:12 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	f	2025-10-08 01:25:12.06373+02
891d3a4c-fff8-4e73-b974-f2eeef336ba4	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:25:16 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	f	2025-10-08 01:25:16.395663+02
67d071bd-4f29-47ac-b9f6-9f1e8c4eea23	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:25:20 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	f	2025-10-08 01:25:20.681655+02
4060622e-1d8a-4a7c-b489-cf4c3c3d83e1	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:25:48 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-08 01:25:48.85334+02
c0fcbf72-8a93-462f-90c5-919a8ba4126d	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:25:54 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-08 01:25:54.117352+02
e9a225ae-bf4e-49e5-894d-74e18b99ed69	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 2\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:26:32 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 2}	f	2025-10-08 01:26:32.809021+02
347a313a-760b-4679-ba38-17f3536dc2f3	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:25:44 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-08 01:25:44.309536+02
ebf0860c-1222-4a68-b83d-34256bfc6f49	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 2\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:26:38 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 2}	f	2025-10-08 01:26:38.22814+02
28840ce4-3f63-4f93-94d2-4b0008e5e340	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 2\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:26:43 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 2}	f	2025-10-08 01:26:43.110194+02
e5c6e798-2941-49e6-af42-363caf99e9db	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:32:57 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	f	2025-10-08 01:32:57.767319+02
a50c336f-dff6-42d2-9d90-6013bf83c2a6	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:33:03 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	f	2025-10-08 01:33:03.685381+02
6496dcaf-08cb-41af-a780-960b0a026186	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 1\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 1:33:09 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 1}	f	2025-10-08 01:33:09.102575+02
dcab58d0-ffeb-495e-9845-dc1eca07475d	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 2:57:50 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-08 02:57:50.137114+02
7371556b-2c14-42f7-8a63-a4595c4bd309	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 2:57:55 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-08 02:57:55.152926+02
b3880a28-9e70-43d4-8220-240ceadc5515	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	📉 STOCK ALERT - CRITICAL LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 0\n🎯 Threshold: 10\n📱 Alert Type: CRITICAL\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 2:57:59 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "critical", "current_quantity": 0}	f	2025-10-08 02:57:59.549698+02
61fe089c-3830-4a9e-8f3f-1756c8449589	3edce773-cadd-43f2-ad49-5dc72a2c80a4	Stock Alert: Surami	📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 3:22:03 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 3}	f	2025-10-08 03:22:03.882735+02
38ed8212-3403-42be-9762-aaa8ddc05cec	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	Stock Alert: Surami	📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 3:22:08 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 3}	f	2025-10-08 03:22:08.403219+02
79aaaddc-799a-4cc5-966d-4ea746d71467	572c001e-2c97-40c1-8276-c73a0bb6572f	Stock Alert: Surami	📉 STOCK ALERT - LOW LEVEL\n\n📦 Item: Surami\n📊 Current Stock: 3\n🎯 Threshold: 10\n📱 Alert Type: LOW\n\nPlease restock immediately to avoid stockout!\n\nTime: 10/8/2025, 3:22:14 AM	stock_alert	{"source": "stock_out", "item_name": "Surami", "threshold": 10, "alert_type": "low", "current_quantity": 3}	f	2025-10-08 03:22:14.282032+02
\.


--
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: khalifainternationalaward
--

COPY public.regions (id, name, description, created_at, updated_at) FROM stdin;
c33dc2c6-297e-482e-8987-de0f188642bd	Main Region	Primary region for operations	2025-10-03 23:55:37.125126+02	2025-10-03 23:55:37.125126+02
\.


--
-- Data for Name: stock; Type: TABLE DATA; Schema: public; Owner: khalifainternationalaward
--

COPY public.stock (id, item_id, current_quantity, last_updated, updated_by, created_at, updated_at) FROM stdin;
f8c75989-8ed9-427b-aaad-99fc6e8f1348	e74d99e6-f785-4d0c-8a09-5c38eaac99e6	0	2025-10-07 23:01:59.558711+02	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 01:08:21.057821+02	2025-10-07 23:01:59.558711+02
d715eb43-dd9a-4f15-9119-c1b43f0083fa	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	3	2025-10-08 03:22:03.8416+02	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-04 00:01:17.942071+02	2025-10-08 03:22:03.8416+02
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: khalifainternationalaward
--

COPY public.stock_movements (id, item_id, movement_type, quantity, reason, created_by, created_at) FROM stdin;
cba91b67-1f03-4472-a496-f52a27b40b79	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	in	10	Quick stock in	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-04 00:02:06.476474+02
e76934b3-1228-4069-b28f-ea3d386a6792	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	out	1	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-04 00:02:58.896428+02
59f504e6-dfa7-4628-9b5b-1ca7e2725df7	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	out	1	Moveout list processing	3edce773-cadd-43f2-ad49-5dc72a2c80a4	2025-10-04 00:35:57.220633+02
eeed7317-0cb9-4e66-b9b2-c4b0f8a07ae0	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	in	10	Quick stock in	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-04 00:42:28.287731+02
efd1bf4d-fa14-4603-a626-24c9b86ad300	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	out	1	Moveout list processing	572c001e-2c97-40c1-8276-c73a0bb6572f	2025-10-04 00:42:42.60139+02
7fc8cea2-508b-4cdd-8ddd-e6a7318f45a6	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	out	3	Moveout list processing	3edce773-cadd-43f2-ad49-5dc72a2c80a4	2025-10-04 00:51:31.944363+02
ead554a6-2b95-4043-9ac7-5f88a099f00e	e74d99e6-f785-4d0c-8a09-5c38eaac99e6	in	12	Quick stock in	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 01:09:53.237574+02
540a59b0-d387-417d-ac19-34da5c0171a5	e74d99e6-f785-4d0c-8a09-5c38eaac99e6	out	5	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 01:10:11.293784+02
f1f6e642-0414-4bf8-98f6-6d1180a4f2c3	e74d99e6-f785-4d0c-8a09-5c38eaac99e6	out	4	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 01:10:41.53393+02
ce65d7bd-44c2-454c-8104-31265e642072	e74d99e6-f785-4d0c-8a09-5c38eaac99e6	out	1	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 01:12:33.609028+02
0c452293-12be-4146-8901-c7b15796a7a3	e74d99e6-f785-4d0c-8a09-5c38eaac99e6	out	1	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 01:23:28.740197+02
39786872-6f25-4f68-9f4d-f5cc3b9238ea	e74d99e6-f785-4d0c-8a09-5c38eaac99e6	in	6	Quick stock in	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 01:29:40.348166+02
ebd9ac52-d165-4bbb-bb78-2a709217994f	e74d99e6-f785-4d0c-8a09-5c38eaac99e6	out	1	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 01:29:56.533232+02
930333b1-1811-47e0-949c-ca135d50946a	e74d99e6-f785-4d0c-8a09-5c38eaac99e6	out	1	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 01:30:23.218318+02
1d3d828f-8fb6-4e16-8c67-61262ca2495a	e74d99e6-f785-4d0c-8a09-5c38eaac99e6	in	12	Quick stock in	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 13:58:52.903868+02
07f3e9dd-7ccc-4781-85f7-982f9ffa8174	e74d99e6-f785-4d0c-8a09-5c38eaac99e6	out	1	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 14:38:34.558629+02
65190d49-56b2-4a9e-bf5b-51c81a25e463	e74d99e6-f785-4d0c-8a09-5c38eaac99e6	in	10	Quick stock in	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 15:04:26.276409+02
0ba1d9e9-95b1-4e2c-b6e7-c5424650f2b3	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	in	9	Quick stock in	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 15:04:32.316231+02
acb70551-cebd-4044-b1c8-ed633866df3f	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	out	1	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 15:24:54.856257+02
8eea7b01-131b-4b24-9dbc-91de9687e993	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	in	10	Quick stock in	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-07 23:08:45.465135+02
b11a19e8-6021-459d-b4ed-3e1d54c70b80	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	out	2	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-08 01:23:12.72876+02
9e678d2d-0fd2-42c5-aee9-fae24dfbed46	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	out	1	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-08 01:24:25.680012+02
fe3a4a35-8d08-42cf-9b06-423589c0cc4c	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	out	1	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-08 01:25:12.052882+02
ad03a322-71e9-471b-b9b7-02f2d054f6ad	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	out	1	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-08 01:25:44.30164+02
8349c060-4a5f-4e4a-87c2-3e6b4ee30723	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	in	3	Quick stock in	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-08 01:26:14.236869+02
dcbb6824-6af9-4bc0-9144-5fd85b70bbb3	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	out	1	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-08 01:26:32.797037+02
4f251c02-ee5a-4245-8ac1-90cfa443d410	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	out	1	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-08 01:32:57.750894+02
8fe58f0c-a128-4bdd-a39c-1119f7103973	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	out	1	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-08 02:57:50.123986+02
b8f743be-8a8b-42ed-92b7-4520bf79e384	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	in	10	Quick stock in	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-08 03:21:55.404063+02
deda4fb8-d256-4eb0-8f45-e925b59032c6	9915abfa-5327-4d0b-8cfd-2a4eb8d5cdd0	out	7	Quick stock out	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	2025-10-08 03:22:03.842883+02
\.


--
-- Data for Name: stock_receipts; Type: TABLE DATA; Schema: public; Owner: khalifainternationalaward
--

COPY public.stock_receipts (id, supplier_name, receipt_file_path, receipt_file_name, remarks, status, submitted_by, reviewed_by, branch_id, created_at, updated_at, reviewed_at) FROM stdin;
998e72f3-8498-495d-a63c-c7296fc18f7b	Tingstad	/Users/khalifainternationalaward/Downloads/stock-nexus-84-main 2/backend/uploads/receipts/receipt-1759532044256-601699649.pdf	moveout-list-2025-10-01 (1).pdf	zssss	approved	3edce773-cadd-43f2-ad49-5dc72a2c80a4	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	e3204bd8-ac3d-413f-bd7b-2727e9c7f598	2025-10-04 00:54:04.263588+02	2025-10-04 00:54:24.344769+02	2025-10-04 00:54:24.344769+02
d51304a2-ef61-4772-96e7-6c12d4db03f2	Gronsakshuset	/Users/khalifainternationalaward/Downloads/stock-nexus-84-main 2/backend/uploads/receipts/receipt-1759533187428-279366878.png	Screenshot 2025-09-30 at 03.39.56.png	\N	approved	3edce773-cadd-43f2-ad49-5dc72a2c80a4	ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	e3204bd8-ac3d-413f-bd7b-2727e9c7f598	2025-10-04 01:13:07.433825+02	2025-10-04 01:16:29.530879+02	2025-10-04 01:16:29.530879+02
8703ec43-24b9-458e-8868-ba7167d02eff	Spendrups	/Users/khalifainternationalaward/Downloads/stock-nexus-84-main 2/backend/uploads/receipts/receipt-1759871244785-422179674.png	Screenshot 2025-09-30 at 03.39.56.png	ok	pending	3edce773-cadd-43f2-ad49-5dc72a2c80a4	\N	e3204bd8-ac3d-413f-bd7b-2727e9c7f598	2025-10-07 23:07:24.793522+02	2025-10-07 23:07:24.793522+02	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: khalifainternationalaward
--

COPY public.users (id, email, password_hash, name, phone, photo_url, "position", role, branch_id, branch_context, last_access, access_count, is_active, created_at, updated_at, region_id, district_id, notification_settings, stock_alert_frequency, stock_alert_schedule_day, stock_alert_schedule_date, stock_alert_schedule_time, stock_alert_frequencies, event_reminder_frequencies, daily_schedule_time, weekly_schedule_day, weekly_schedule_time, monthly_schedule_date, monthly_schedule_time, event_daily_schedule_time, event_weekly_schedule_day, event_weekly_schedule_time, event_monthly_schedule_date, event_monthly_schedule_time) FROM stdin;
3edce773-cadd-43f2-ad49-5dc72a2c80a4	kaumadi19910119@gmail.com	$2b$10$wu5LAX1zilcAZZ0lBd4eXOggjkOZO3w99jqwuxeJZNIpGPRLxGVqC	Kaumadi Mihirika	\N	\N	\N	staff	e3204bd8-ac3d-413f-bd7b-2727e9c7f598	e3204bd8-ac3d-413f-bd7b-2727e9c7f598	2025-10-08 03:21:38.063931+02	29	t	2025-10-03 23:35:01.160034+02	2025-10-08 03:21:38.063931+02	\N	\N	{"sms": false, "email": true, "whatsapp": false, "eventReminders": true, "stockLevelAlerts": true}	\N	\N	\N	\N	[]	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
ad23ba39-c4c0-47cd-9f0e-9bf7333cd7f6	aa@aa.com	$2b$10$sCE96Xc2Rdy7wTHEpmntW.oTufIb02ob7U27KjDwCcSqAKpSIa.hm	Jaber Ahmed	+46722204924	\N	Admin	manager	e3204bd8-ac3d-413f-bd7b-2727e9c7f598	\N	2025-10-08 03:21:47.673396+02	23	t	2025-10-03 23:35:01.160034+02	2025-10-08 03:21:47.673396+02	\N	\N	{"sms": false, "email": true, "whatsapp": true, "eventReminders": true, "stockLevelAlerts": true}	immediate	\N	\N	09:00:00	["daily"]	[]	01:35:00	\N	\N	\N	\N	\N	\N	\N	\N	\N
33a7cfe4-65e8-49a4-aaca-9ad4f6847d04	lakshan@gmail.com	$2b$10$GIJm3KhmxGcfJC2fJykXY.jAuh3VwpNDHrOO913ml05r/3ZqskBrG	Lakshqn Rupasinghe	072 220 48 41	\N	Staff	staff	e3204bd8-ac3d-413f-bd7b-2727e9c7f598	\N	\N	0	t	2025-10-07 01:04:47.543791+02	2025-10-07 01:05:56.71988+02	\N	\N	{"sms": false, "email": true, "whatsapp": false, "eventReminders": false, "stockLevelAlerts": false}	\N	\N	\N	\N	[]	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
572c001e-2c97-40c1-8276-c73a0bb6572f	slaksh7@gmail.com	$2b$10$sCE96Xc2Rdy7wTHEpmntW.oTufIb02ob7U27KjDwCcSqAKpSIa.hm	S Laksh	+1234567891	\N	Manager	staff	e3204bd8-ac3d-413f-bd7b-2727e9c7f598	e3204bd8-ac3d-413f-bd7b-2727e9c7f598	2025-10-07 23:03:08.392118+02	12	t	2025-10-03 23:35:01.160034+02	2025-10-07 23:03:08.392118+02	\N	\N	{"sms": false, "email": true, "whatsapp": false, "eventReminders": true, "stockLevelAlerts": true}	\N	\N	\N	\N	[]	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
7c6fc959-5e6e-4b57-ad76-66abb86a16ab	admin@stocknexus.com	$2b$10$Fv/h0WBgV3FMuxdEvE6s3edR3ZJkPiDqDFi8PFNKuiO9PgSWuxh1C	System Administrator	+1234567890	\N	System Admin	admin	\N	\N	2025-10-07 02:41:48.657121+02	14	t	2025-10-03 23:30:56.300237+02	2025-10-07 02:41:48.657121+02	\N	\N	{}	\N	\N	\N	\N	[]	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: districts districts_pkey; Type: CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: moveout_lists moveout_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.moveout_lists
    ADD CONSTRAINT moveout_lists_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: regions regions_name_key; Type: CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_name_key UNIQUE (name);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: stock stock_pkey; Type: CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.stock
    ADD CONSTRAINT stock_pkey PRIMARY KEY (id);


--
-- Name: stock_receipts stock_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT stock_receipts_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_logs_branch_id; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_activity_logs_branch_id ON public.activity_logs USING btree (branch_id);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at);


--
-- Name: idx_activity_logs_entity_id; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_activity_logs_entity_id ON public.activity_logs USING btree (entity_id);


--
-- Name: idx_activity_logs_entity_type; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_activity_logs_entity_type ON public.activity_logs USING btree (entity_type);


--
-- Name: idx_activity_logs_user_id; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);


--
-- Name: idx_calendar_events_branch_id; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_calendar_events_branch_id ON public.calendar_events USING btree (branch_id);


--
-- Name: idx_calendar_events_created_by; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_calendar_events_created_by ON public.calendar_events USING btree (created_by);


--
-- Name: idx_calendar_events_event_date; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_calendar_events_event_date ON public.calendar_events USING btree (event_date);


--
-- Name: idx_items_branch_id; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_items_branch_id ON public.items USING btree (branch_id);


--
-- Name: idx_items_category; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_items_category ON public.items USING btree (category);


--
-- Name: idx_moveout_lists_created_at; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_moveout_lists_created_at ON public.moveout_lists USING btree (created_at);


--
-- Name: idx_moveout_lists_created_by; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_moveout_lists_created_by ON public.moveout_lists USING btree (created_by);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_stock_item_id; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_stock_item_id ON public.stock USING btree (item_id);


--
-- Name: idx_stock_movements_created_at; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_stock_movements_created_at ON public.stock_movements USING btree (created_at);


--
-- Name: idx_stock_movements_item_id; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_stock_movements_item_id ON public.stock_movements USING btree (item_id);


--
-- Name: idx_stock_receipts_branch_id; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_stock_receipts_branch_id ON public.stock_receipts USING btree (branch_id);


--
-- Name: idx_stock_receipts_created_at; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_stock_receipts_created_at ON public.stock_receipts USING btree (created_at);


--
-- Name: idx_stock_receipts_status; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_stock_receipts_status ON public.stock_receipts USING btree (status);


--
-- Name: idx_stock_receipts_submitted_by; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_stock_receipts_submitted_by ON public.stock_receipts USING btree (submitted_by);


--
-- Name: idx_users_branch_id; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_users_branch_id ON public.users USING btree (branch_id);


--
-- Name: idx_users_district_id; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_users_district_id ON public.users USING btree (district_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_region_id; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_users_region_id ON public.users USING btree (region_id);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: khalifainternationalaward
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: branches update_branches_updated_at; Type: TRIGGER; Schema: public; Owner: khalifainternationalaward
--

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: districts update_districts_updated_at; Type: TRIGGER; Schema: public; Owner: khalifainternationalaward
--

CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON public.districts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: items update_items_updated_at; Type: TRIGGER; Schema: public; Owner: khalifainternationalaward
--

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: moveout_lists update_moveout_lists_updated_at; Type: TRIGGER; Schema: public; Owner: khalifainternationalaward
--

CREATE TRIGGER update_moveout_lists_updated_at BEFORE UPDATE ON public.moveout_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: regions update_regions_updated_at; Type: TRIGGER; Schema: public; Owner: khalifainternationalaward
--

CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON public.regions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stock update_stock_updated_at; Type: TRIGGER; Schema: public; Owner: khalifainternationalaward
--

CREATE TRIGGER update_stock_updated_at BEFORE UPDATE ON public.stock FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: khalifainternationalaward
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_logs activity_logs_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: branches branches_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE CASCADE;


--
-- Name: calendar_events calendar_events_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: calendar_events calendar_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: districts districts_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE CASCADE;


--
-- Name: items items_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: items items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: moveout_lists moveout_lists_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.moveout_lists
    ADD CONSTRAINT moveout_lists_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: moveout_lists moveout_lists_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.moveout_lists
    ADD CONSTRAINT moveout_lists_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: moveout_lists moveout_lists_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.moveout_lists
    ADD CONSTRAINT moveout_lists_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stock stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.stock
    ADD CONSTRAINT stock_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: stock_receipts stock_receipts_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT stock_receipts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: stock_receipts stock_receipts_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT stock_receipts_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_receipts stock_receipts_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT stock_receipts_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stock stock_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.stock
    ADD CONSTRAINT stock_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: users users_branch_context_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_context_fkey FOREIGN KEY (branch_context) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: users users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: users users_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE SET NULL;


--
-- Name: users users_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: khalifainternationalaward
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict DyAfGb4RLa58iXLUUWSS7b9smpZ0TX84Sfx9vYzRuwEWmvZnmXFcsaqd2gJJR4W

