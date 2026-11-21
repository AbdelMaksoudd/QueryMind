"""Domain exceptions mapped to HTTP responses by the application handler."""


class LibraryError(Exception):
    status_code = 400


class NotFoundError(LibraryError):
    status_code = 404


class ForbiddenError(LibraryError):
    status_code = 403


class ConflictError(LibraryError):
    status_code = 409
