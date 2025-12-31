from flask import jsonify

def success_response(data=None, message='操作成功'):
    return jsonify({
        'code': 200,
        'message': message,
        'data': data
    })

def error_response(message='操作失败', code=400):
    return jsonify({
        'code': code,
        'message': message,
        'data': None
    }), code

def paginated_response(items, total, page, page_size):
    return jsonify({
        'code': 200,
        'message': '操作成功',
        'data': {
            'items': items,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size
        }
    })
